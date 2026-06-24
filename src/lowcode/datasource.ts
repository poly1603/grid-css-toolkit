/**
 * 数据源管理器 - 低代码平台的数据层
 *
 * 功能：
 * - API 数据源配置
 * - Mock 数据
 * - GraphQL 支持
 * - WebSocket 实时数据
 * - 数据缓存
 * - 请求拦截器
 * - 数据转换
 */

import type { DataContext } from './data-binding';
import { uid } from '../core/converter';

// ─── 数据源类型 ────────────────────────────────────────────

export type DataSourceType = 'api' | 'mock' | 'graphql' | 'websocket' | 'variable' | 'computed';

export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSourceType;
  /** 是否自动请求 */
  autoFetch?: boolean;
  /** 请求间隔 (ms, 用于轮询) */
  interval?: number;
  /** 缓存时间 (ms) */
  cacheTime?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟 (ms) */
  retryDelay?: number;
  /** 请求配置 */
  request?: RequestConfig;
  /** Mock 配置 */
  mock?: MockConfig;
  /** GraphQL 配置 */
  graphql?: GraphQLConfig;
  /** WebSocket 配置 */
  websocket?: WebSocketConfig;
  /** 变量类型 */
  variable?: { initialValue: unknown };
  /** 计算类型 */
  computed?: { expression: string; dependencies: string[] };
  /** 数据转换 */
  transform?: TransformConfig;
  /** 请求前置条件 */
  condition?: string;
  /** 加载状态变量 */
  loadingVar?: string;
  /** 错误状态变量 */
  errorVar?: string;
  /** 响应数据存储变量 */
  dataVar?: string;
}

export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  body?: unknown;
  timeout?: number;
  /** 请求拦截器 */
  beforeRequest?: string; // 脚本代码
  /** 响应拦截器 */
  afterResponse?: string; // 脚本代码
  /** 错误处理 */
  onError?: string; // 脚本代码
}

export interface MockConfig {
  /** Mock 模板 */
  template: unknown;
  /** 延时范围 [min, max] ms */
  delay?: [number, number];
  /** 错误率 (0-1) */
  errorRate?: number;
  /** 是否分页 */
  pagination?: { pageSize: number; total: number };
}

export interface GraphQLConfig {
  endpoint: string;
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export interface WebSocketConfig {
  url: string;
  /** 心跳间隔 (ms) */
  heartbeat?: number;
  /** 心跳消息 */
  heartbeatMessage?: string;
  /** 重连间隔 (ms) */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnects?: number;
  /** 消息过滤器 (表达式) */
  messageFilter?: string;
}

export interface TransformConfig {
  /** 响应数据提取路径 */
  extractPath?: string;
  /** 映射转换脚本 */
  mapScript?: string;
  /** 过滤条件 */
  filterExpression?: string;
  /** 排序 */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── 数据源实例 ────────────────────────────────────────────

export interface DataSourceInstance {
  id: string;
  config: DataSourceConfig;
  data: unknown;
  loading: boolean;
  error: Error | null;
  lastFetchTime: number;
  cache: Map<string, { data: unknown; timestamp: number }>;
  disposed: boolean;
}

// ─── 数据源管理器 ──────────────────────────────────────────

export class DataSourceManager {
  private sources = new Map<string, DataSourceInstance>();
  private dataContext: DataContext;
  private interceptors: {
    request: Array<(config: RequestConfig) => RequestConfig>;
    response: Array<(data: unknown, config: RequestConfig) => unknown>;
    error: Array<(error: Error, config: RequestConfig) => unknown>;
  } = { request: [], response: [], error: [] };
  private timers = new Map<string, number>();
  private wsConnections = new Map<string, WebSocket>();

  constructor(dataContext: DataContext) {
    this.dataContext = dataContext;
  }

  // ─── 注册/注销 ──────────────────────────────────────────

  /** 注册数据源 */
  register(config: DataSourceConfig): DataSourceInstance {
    const instance: DataSourceInstance = {
      id: config.id,
      config,
      data: config.variable?.initialValue ?? null,
      loading: false,
      error: null,
      lastFetchTime: 0,
      cache: new Map(),
      disposed: false,
    };

    this.sources.set(config.id, instance);

    // 自动请求
    if (config.autoFetch && config.type !== 'variable' && config.type !== 'computed') {
      this.fetch(config.id);
    }

    // 轮询
    if (config.interval && config.interval > 0) {
      this.startPolling(config.id, config.interval);
    }

    // WebSocket
    if (config.type === 'websocket' && config.websocket) {
      this.connectWebSocket(config.id, config.websocket);
    }

    // 存储初始变量
    if (config.dataVar) {
      this.dataContext.set(config.dataVar, instance.data);
    }

    return instance;
  }

  /** 注销数据源 */
  unregister(id: string): void {
    const instance = this.sources.get(id);
    if (!instance) return;

    instance.disposed = true;

    // 清理定时器
    if (this.timers.has(id)) {
      clearInterval(this.timers.get(id));
      this.timers.delete(id);
    }

    // 关闭 WebSocket
    if (this.wsConnections.has(id)) {
      this.wsConnections.get(id)?.close();
      this.wsConnections.delete(id);
    }

    this.sources.delete(id);
  }

  // ─── 请求执行 ────────────────────────────────────────────

  /** 获取数据 */
  async fetch(id: string, params?: Record<string, unknown>): Promise<unknown> {
    const instance = this.sources.get(id);
    if (!instance || instance.disposed) return null;

    // 条件检查
    if (instance.config.condition) {
      try {
        const result = this.evaluateExpression(instance.config.condition);
        if (!result) return null;
      } catch { /* ignore */ }
    }

    // 缓存检查
    if (instance.config.cacheTime && instance.config.cacheTime > 0) {
      const cacheKey = JSON.stringify(params ?? {});
      const cached = instance.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < instance.config.cacheTime) {
        return cached.data;
      }
    }

    // 设置加载状态
    instance.loading = true;
    instance.error = null;
    if (instance.config.loadingVar) {
      this.dataContext.set(instance.config.loadingVar, true);
    }

    let retries = instance.config.retryCount ?? 0;
    let lastError: Error | null = null;

    while (retries >= 0) {
      try {
        let data: unknown;

        switch (instance.config.type) {
          case 'api':
            data = await this.executeApi(instance.config.request!, params);
            break;
          case 'mock':
            data = await this.executeMock(instance.config.mock!);
            break;
          case 'graphql':
            data = await this.executeGraphQL(instance.config.graphql!);
            break;
          case 'computed':
            data = this.executeComputed(instance.config.computed!);
            break;
          default:
            data = null;
        }

        // 数据转换
        if (instance.config.transform) {
          data = this.transformData(data, instance.config.transform);
        }

        // 更新实例
        instance.data = data;
        instance.loading = false;
        instance.lastFetchTime = Date.now();

        // 更新缓存
        if (instance.config.cacheTime && instance.config.cacheTime > 0) {
          instance.cache.set(JSON.stringify(params ?? {}), { data, timestamp: Date.now() });
        }

        // 存储到变量
        if (instance.config.dataVar) {
          this.dataContext.set(instance.config.dataVar, data);
        }
        if (instance.config.loadingVar) {
          this.dataContext.set(instance.config.loadingVar, false);
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        retries--;
        if (retries >= 0 && instance.config.retryDelay) {
          await new Promise((r) => setTimeout(r, instance.config.retryDelay));
        }
      }
    }

    // 所有重试失败
    instance.loading = false;
    instance.error = lastError;
    if (instance.config.loadingVar) {
      this.dataContext.set(instance.config.loadingVar, false);
    }
    if (instance.config.errorVar) {
      this.dataContext.set(instance.config.errorVar, lastError?.message);
    }

    throw lastError;
  }

  /** 刷新数据源 */
  async refresh(id: string): Promise<void> {
    const instance = this.sources.get(id);
    if (!instance) return;
    // 清除缓存
    instance.cache.clear();
    await this.fetch(id);
  }

  /** 刷新全部 */
  async refreshAll(): Promise<void> {
    const promises = Array.from(this.sources.keys()).map((id) => this.refresh(id).catch(() => {}));
    await Promise.all(promises);
  }

  // ─── API 请求 ────────────────────────────────────────────

  private async executeApi(config: RequestConfig, params?: Record<string, unknown>): Promise<unknown> {
    // 请求拦截
    let finalConfig = { ...config };
    for (const interceptor of this.interceptors.request) {
      finalConfig = interceptor(finalConfig);
    }

    // 构建 URL
    let url = finalConfig.url;
    if (params || finalConfig.params) {
      const allParams = { ...finalConfig.params, ...params };
      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(allParams)) {
        if (v !== undefined && v !== null) search.set(k, String(v));
      }
      url += (url.includes('?') ? '&' : '?') + search.toString();
    }

    // 执行前置脚本
    if (finalConfig.beforeRequest) {
      this.executeScript(finalConfig.beforeRequest, { config: finalConfig, params });
    }

    // 发送请求
    const response = await fetch(url, {
      method: finalConfig.method,
      headers: finalConfig.headers,
      body: finalConfig.body ? JSON.stringify(finalConfig.body) : undefined,
      signal: finalConfig.timeout
        ? AbortSignal.timeout(finalConfig.timeout)
        : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data: unknown = await response.json();

    // 响应拦截
    for (const interceptor of this.interceptors.response) {
      data = interceptor(data, finalConfig);
    }

    // 执行后置脚本
    if (finalConfig.afterResponse) {
      data = this.executeScript(finalConfig.afterResponse, { data, config: finalConfig, params });
    }

    return data;
  }

  // ─── Mock ────────────────────────────────────────────────

  private async executeMock(config: MockConfig): Promise<unknown> {
    // 延时模拟
    if (config.delay) {
      const [min, max] = config.delay;
      const delay = Math.random() * (max - min) + min;
      await new Promise((r) => setTimeout(r, delay));
    }

    // 错误模拟
    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock error');
    }

    // 生成数据
    return this.generateMockData(config.template);
  }

  private generateMockData(template: unknown): unknown {
    if (typeof template === 'string') {
      // Mock 表达式
      if (template.startsWith('@')) {
        return this.evaluateMockExpression(template);
      }
      // 模板字符串中的 {{}} 替换
      return template.replace(/\{\{(.+?)\}\}/g, (_, expr) => String(this.evaluateMockExpression(expr)));
    }
    if (Array.isArray(template)) {
      // 数组模板：第一个元素是模板，第二个是数量
      if (template.length === 2 && typeof template[1] === 'number') {
        return Array.from({ length: template[1] }, () => this.generateMockData(template[0]));
      }
      return template.map((item) => this.generateMockData(item));
    }
    if (template && typeof template === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.generateMockData(value);
      }
      return result;
    }
    return template;
  }

  private evaluateMockExpression(expr: string): unknown {
    const str = String(expr);
    if (str === '@uuid') return uid();
    if (str === '@id') return Math.floor(Math.random() * 10000);
    if (str === '@name') {
      const names = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十'];
      return names[Math.floor(Math.random() * names.length)];
    }
    if (str === '@email') return `user${Math.floor(Math.random() * 1000)}@example.com`;
    if (str === '@phone') return `1${[3, 5, 7, 8, 9][Math.floor(Math.random() * 5)]}${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`;
    if (str === '@date') return new Date(Date.now() - Math.random() * 365 * 86400000).toISOString().split('T')[0];
    if (str === '@datetime') return new Date(Date.now() - Math.random() * 365 * 86400000).toISOString();
    if (str === '@now') return new Date().toISOString();
    if (str === '@title') {
      const titles = ['关于项目进展的汇报', '产品设计方案', '技术架构评审', '需求变更说明', '版本发布计划'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
    if (str === '@city') {
      const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京'];
      return cities[Math.floor(Math.random() * cities.length)];
    }
    if (str === '@status') {
      const statuses = ['active', 'inactive', 'pending', 'disabled'];
      return statuses[Math.floor(Math.random() * statuses.length)];
    }
    if (str.startsWith('@integer')) {
      const match = str.match(/@integer\((\d+),\s*(\d+)\)/);
      if (match) return Math.floor(Math.random() * (Number(match[2]) - Number(match[1]) + 1)) + Number(match[1]);
      return Math.floor(Math.random() * 1000);
    }
    if (str.startsWith('@float')) {
      const match = str.match(/@float\((\d+),\s*(\d+)/);
      if (match) return Number((Math.random() * (Number(match[2]) - Number(match[1])) + Number(match[1])).toFixed(2));
      return Number((Math.random() * 1000).toFixed(2));
    }
    if (str.startsWith('@image')) {
      const match = str.match(/@image\((\d+)x(\d+)\)/);
      const w = match ? match[1] : '200';
      const h = match ? match[2] : '200';
      return `https://picsum.photos/${w}/${h}?random=${Math.floor(Math.random() * 1000)}`;
    }
    return str;
  }

  // ─── GraphQL ─────────────────────────────────────────────

  private async executeGraphQL(config: GraphQLConfig): Promise<unknown> {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: config.query,
        variables: config.variables,
        operationName: config.operationName,
      }),
    });

    if (!response.ok) throw new Error(`GraphQL HTTP ${response.status}`);

    const result = await response.json();
    if (result.errors?.length) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  }

  // ─── 计算属性 ────────────────────────────────────────────

  private executeComputed(config: { expression: string; dependencies: string[] }): unknown {
    const context: Record<string, unknown> = {};
    for (const dep of config.dependencies) {
      context[dep] = this.dataContext.get(dep);
    }
    return this.evaluateExpression(config.expression, context);
  }

  // ─── WebSocket ───────────────────────────────────────────

  private connectWebSocket(id: string, config: WebSocketConfig): void {
    const ws = new WebSocket(config.url);

    ws.onopen = () => {
      console.log(`[DataSource] WebSocket "${id}" connected`);
      // 心跳
      if (config.heartbeat && config.heartbeatMessage) {
        const timer = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && config.heartbeatMessage) {
            ws.send(config.heartbeatMessage!);
          }
        }, config.heartbeat);
        this.timers.set(`ws-heartbeat-${id}`, timer);
      }
    };

    ws.onmessage = (event) => {
      try {
        let data: unknown = JSON.parse(event.data);

        // 消息过滤
        if (config.messageFilter) {
          const result = this.evaluateExpression(config.messageFilter, { data });
          if (!result) return;
        }

        const instance = this.sources.get(id);
        if (instance && !instance.disposed) {
          instance.data = data;
          if (instance.config.dataVar) {
            this.dataContext.set(instance.config.dataVar, data);
          }
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      console.log(`[DataSource] WebSocket "${id}" disconnected`);
      // 重连
      if (config.reconnectInterval && config.maxReconnects) {
        let reconnects = 0;
        const reconnect = () => {
          if (reconnects >= config.maxReconnects!) return;
          reconnects++;
          setTimeout(() => this.connectWebSocket(id, config), config.reconnectInterval);
        };
        reconnect();
      }
    };

    this.wsConnections.set(id, ws);
  }

  // ─── 拦截器 ─────────────────────────────────────────────

  addRequestInterceptor(fn: (config: RequestConfig) => RequestConfig): void {
    this.interceptors.request.push(fn);
  }

  addResponseInterceptor(fn: (data: unknown, config: RequestConfig) => unknown): void {
    this.interceptors.response.push(fn);
  }

  addErrorInterceptor(fn: (error: Error, config: RequestConfig) => unknown): void {
    this.interceptors.error.push(fn);
  }

  // ─── 数据转换 ────────────────────────────────────────────

  private transformData(data: unknown, config: TransformConfig): unknown {
    let result = data;

    // 路径提取
    if (config.extractPath) {
      const parts = config.extractPath.split('.');
      for (const part of parts) {
        result = (result as any)?.[part];
      }
    }

    // 映射转换
    if (config.mapScript && Array.isArray(result)) {
      try {
        const fn = new Function('item', 'index', config.mapScript) as (item: any, index: number) => unknown;
        result = result.map(fn);
      } catch { /* ignore */ }
    }

    // 过滤
    if (config.filterExpression && Array.isArray(result)) {
      try {
        const fn = new Function('item', `return ${config.filterExpression}`) as (item: any) => boolean;
        result = result.filter(fn);
      } catch { /* ignore */ }
    }

    // 排序
    if (config.sortBy && Array.isArray(result)) {
      const key = config.sortBy;
      const order = config.sortOrder === 'desc' ? -1 : 1;
      result = [...result].sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        return va > vb ? order : va < vb ? -order : 0;
      });
    }

    return result;
  }

  // ─── 工具 ────────────────────────────────────────────────

  private startPolling(id: string, interval: number): void {
    const timer = window.setInterval(() => {
      const instance = this.sources.get(id);
      if (instance && !instance.disposed && !instance.loading) {
        this.fetch(id).catch(() => {});
      }
    }, interval);
    this.timers.set(id, timer);
  }

  private evaluateExpression(expression: string, extraContext?: Record<string, unknown>): unknown {
    const context = { ...this.dataContext.getAll(), ...extraContext };
    const keys = Object.keys(context);
    const values = keys.map((k) => context[k]);
    try {
      const fn = new Function(...keys, `return (${expression})`);
      return fn(...values);
    } catch {
      return undefined;
    }
  }

  private executeScript(code: string, context: Record<string, unknown>): unknown {
    const allContext = { ...this.dataContext.getAll(), ...context };
    const keys = Object.keys(allContext);
    const values = keys.map((k) => allContext[k]);
    try {
      const fn = new Function(...keys, code);
      return fn(...values);
    } catch (e) {
      console.error('[DataSource] Script error:', e);
      return undefined;
    }
  }

  /** 获取数据源实例 */
  get(id: string): DataSourceInstance | undefined {
    return this.sources.get(id);
  }

  /** 获取全部 */
  getAll(): DataSourceInstance[] {
    return Array.from(this.sources.values());
  }

  /** 设置变量值 (variable 类型) */
  setValue(id: string, value: unknown): void {
    const instance = this.sources.get(id);
    if (instance && instance.config.type === 'variable') {
      instance.data = value;
      if (instance.config.dataVar) {
        this.dataContext.set(instance.config.dataVar, value);
      }
    }
  }

  destroy(): void {
    this.timers.forEach((t) => clearInterval(t));
    this.wsConnections.forEach((ws) => ws.close());
    this.sources.clear();
    this.timers.clear();
    this.wsConnections.clear();
  }
}
