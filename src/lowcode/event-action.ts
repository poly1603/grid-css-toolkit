/**
 * 事件动作系统 - 低代码平台的交互引擎
 *
 * 功能：
 * - 事件监听/触发
 * - 动作链 (串行/并行/条件/循环)
 * - 组件间通信
 * - 数据联动
 * - 防抖/节流
 * - 事件回放
 */

import type { DataContext } from './data-binding';
import { uid } from '../core/converter';

// ─── 事件定义 ──────────────────────────────────────────────

export interface EventDefinition {
  id: string;
  name: string;
  /** 触发源：组件ID 或 'system'/'page'/'global' */
  source: string;
  /** 事件类型 */
  type: string;
  /** 触发条件 (表达式) */
  condition?: string;
  /** 防抖 (ms) */
  debounce?: number;
  /** 节流 (ms) */
  throttle?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 动作列表 */
  actions: ActionDefinition[];
}

// ─── 动作定义 ──────────────────────────────────────────────

export type ActionType =
  | 'setState'        // 设置变量
  | 'setComponent'    // 设置组件属性
  | 'http'            // HTTP 请求
  | 'navigate'        // 页面跳转
  | 'showMessage'     // 显示消息
  | 'showDialog'      // 显示弹窗
  | 'closeDialog'     // 关闭弹窗
  | 'emitEvent'       // 触发自定义事件
  | 'condition'       // 条件判断
  | 'loop'            // 循环
  | 'delay'           // 延时
  | 'script'          // 自定义脚本
  | 'copy'            // 复制到剪贴板
  | 'download'        // 下载文件
  | 'validate'        // 表单校验
  | 'reset'           // 重置表单
  | 'refresh'         // 刷新数据源
  | 'custom';         // 自定义动作

export interface ActionDefinition {
  id: string;
  type: ActionType;
  /** 是否禁用 */
  disabled?: boolean;
  /** 执行条件 */
  condition?: string;
  /** 动作配置 */
  config: Record<string, unknown>;
  /** 子动作 (用于 condition/loop) */
  children?: ActionDefinition[];
  /** 成功后的动作 */
  onSuccess?: ActionDefinition[];
  /** 失败后的动作 */
  onFail?: ActionDefinition[];
}

// ─── 预设动作配置 Schema ───────────────────────────────────

export interface ActionConfigSchema {
  type: ActionType;
  label: string;
  icon: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'expression' | 'code' | 'json';
    required?: boolean;
    default?: unknown;
    options?: Array<{ label: string; value: unknown }>;
    description?: string;
  }>;
}

export const ACTION_SCHEMAS: ActionConfigSchema[] = [
  {
    type: 'setState',
    label: '设置变量',
    icon: '📝',
    description: '更新数据上下文中的变量值',
    fields: [
      { name: 'path', label: '变量路径', type: 'string', required: true, description: '如 user.name、list[0].title' },
      { name: 'value', label: '值', type: 'expression', required: true, description: '支持表达式，如 {{formData.name}}' },
    ],
  },
  {
    type: 'setComponent',
    label: '设置组件属性',
    icon: '🧩',
    description: '动态修改组件的属性值',
    fields: [
      { name: 'componentId', label: '组件ID', type: 'string', required: true },
      { name: 'prop', label: '属性名', type: 'string', required: true },
      { name: 'value', label: '值', type: 'expression', required: true },
    ],
  },
  {
    type: 'http',
    label: 'HTTP 请求',
    icon: '🌐',
    description: '发送 HTTP 请求获取数据',
    fields: [
      { name: 'method', label: '方法', type: 'select', required: true, options: [
        { label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' }, { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' },
      ]},
      { name: 'url', label: 'URL', type: 'expression', required: true },
      { name: 'headers', label: '请求头', type: 'json' },
      { name: 'body', label: '请求体', type: 'expression' },
      { name: 'responsePath', label: '响应提取路径', type: 'string', description: '如 data.list' },
      { name: 'statePath', label: '存储到变量', type: 'string', description: '如 tableData' },
    ],
  },
  {
    type: 'navigate',
    label: '页面跳转',
    icon: '🔗',
    description: '跳转到指定页面',
    fields: [
      { name: 'url', label: 'URL', type: 'expression', required: true },
      { name: 'target', label: '打开方式', type: 'select', default: '_self', options: [
        { label: '当前窗口', value: '_self' }, { label: '新窗口', value: '_blank' },
      ]},
      { name: 'params', label: 'URL参数', type: 'json' },
    ],
  },
  {
    type: 'showMessage',
    label: '显示消息',
    icon: '💬',
    description: '显示提示消息',
    fields: [
      { name: 'content', label: '消息内容', type: 'expression', required: true },
      { name: 'type', label: '消息类型', type: 'select', default: 'info', options: [
        { label: '信息', value: 'info' }, { label: '成功', value: 'success' },
        { label: '警告', value: 'warning' }, { label: '错误', value: 'error' },
      ]},
      { name: 'duration', label: '显示时长(ms)', type: 'number', default: 3000 },
    ],
  },
  {
    type: 'showDialog',
    label: '显示弹窗',
    icon: '🪟',
    description: '打开弹窗/抽屉',
    fields: [
      { name: 'dialogId', label: '弹窗ID', type: 'string', required: true },
      { name: 'data', label: '传递数据', type: 'json' },
      { name: 'width', label: '宽度', type: 'string' },
    ],
  },
  {
    type: 'emitEvent',
    label: '触发事件',
    icon: '📡',
    description: '触发自定义事件，用于组件间通信',
    fields: [
      { name: 'eventName', label: '事件名称', type: 'string', required: true },
      { name: 'payload', label: '事件数据', type: 'expression' },
    ],
  },
  {
    type: 'condition',
    label: '条件判断',
    icon: '❓',
    description: '根据条件执行不同动作',
    fields: [
      { name: 'expression', label: '条件表达式', type: 'expression', required: true, description: '返回 true/false' },
    ],
  },
  {
    type: 'loop',
    label: '循环',
    icon: '🔄',
    description: '遍历数组执行动作',
    fields: [
      { name: 'dataSource', label: '数据源', type: 'expression', required: true },
      { name: 'itemName', label: '循环变量名', type: 'string', default: 'item' },
      { name: 'indexName', label: '索引变量名', type: 'string', default: 'index' },
    ],
  },
  {
    type: 'delay',
    label: '延时',
    icon: '⏱',
    description: '延迟执行后续动作',
    fields: [
      { name: 'duration', label: '延时(ms)', type: 'number', required: true, default: 1000 },
    ],
  },
  {
    type: 'script',
    label: '自定义脚本',
    icon: '💻',
    description: '执行自定义 JavaScript 代码',
    fields: [
      { name: 'code', label: '代码', type: 'code', required: true },
    ],
  },
  {
    type: 'copy',
    label: '复制到剪贴板',
    icon: '📋',
    description: '复制文本到系统剪贴板',
    fields: [
      { name: 'content', label: '内容', type: 'expression', required: true },
    ],
  },
  {
    type: 'download',
    label: '下载文件',
    icon: '⬇',
    description: '下载数据为文件',
    fields: [
      { name: 'data', label: '数据', type: 'expression', required: true },
      { name: 'filename', label: '文件名', type: 'string', default: 'download.json' },
      { name: 'mimeType', label: 'MIME类型', type: 'string', default: 'application/json' },
    ],
  },
];

// ─── 事件执行器 ────────────────────────────────────────────

export interface ActionExecutorContext {
  dataContext: DataContext;
  getComponent: (id: string) => { setProps: (props: Record<string, unknown>) => void } | undefined;
  showMessage: (content: string, type?: string, duration?: number) => void;
  showDialog: (id: string, data?: unknown) => void;
  closeDialog: (id: string) => void;
  navigate: (url: string, target?: string) => void;
  emitEvent: (name: string, payload?: unknown) => void;
  validateForm: (id: string) => boolean;
}

export class ActionExecutor {
  private ctx: ActionExecutorContext;

  constructor(ctx: ActionExecutorContext) {
    this.ctx = ctx;
  }

  /** 执行单个动作 */
  async execute(action: ActionDefinition, extraContext?: Record<string, unknown>): Promise<void> {
    if (action.disabled) return;

    // 条件检查
    if (action.condition) {
      const result = this.evaluate(action.condition, extraContext);
      if (!result) return;
    }

    switch (action.type) {
      case 'setState':
        this.executeSetState(action.config, extraContext);
        break;
      case 'setComponent':
        this.executeSetComponent(action.config, extraContext);
        break;
      case 'http':
        await this.executeHttp(action, extraContext);
        break;
      case 'navigate':
        this.executeNavigate(action.config, extraContext);
        break;
      case 'showMessage':
        this.executeShowMessage(action.config, extraContext);
        break;
      case 'showDialog':
        this.ctx.showDialog(
          this.resolve(action.config.dialogId, extraContext) as string,
          this.resolve(action.config.data, extraContext)
        );
        break;
      case 'closeDialog':
        this.ctx.closeDialog(this.resolve(action.config.dialogId, extraContext) as string);
        break;
      case 'emitEvent':
        this.ctx.emitEvent(
          this.resolve(action.config.eventName, extraContext) as string,
          this.resolve(action.config.payload, extraContext)
        );
        break;
      case 'condition':
        await this.executeCondition(action, extraContext);
        break;
      case 'loop':
        await this.executeLoop(action, extraContext);
        break;
      case 'delay':
        await this.executeDelay(action.config);
        break;
      case 'script':
        this.executeScript(action.config, extraContext);
        break;
      case 'copy':
        await navigator.clipboard?.writeText(
          String(this.resolve(action.config.content, extraContext))
        );
        break;
      case 'download':
        this.executeDownload(action.config, extraContext);
        break;
      case 'refresh':
        // 由外部数据源管理器处理
        break;
    }
  }

  /** 执行动作链 */
  async executeChain(actions: ActionDefinition[], extraContext?: Record<string, unknown>): Promise<void> {
    for (const action of actions) {
      try {
        await this.execute(action, extraContext);
        if (action.onSuccess?.length) {
          await this.executeChain(action.onSuccess, extraContext);
        }
      } catch (error) {
        console.error(`[ActionExecutor] Action "${action.type}" failed:`, error);
        if (action.onFail?.length) {
          await this.executeChain(action.onFail, { ...extraContext, error });
        }
      }
    }
  }

  // ─── 动作执行实现 ───────────────────────────────────────

  private executeSetState(config: Record<string, unknown>, extra?: Record<string, unknown>): void {
    const path = String(this.resolve(config.path, extra));
    const value = this.resolve(config.value, extra);
    this.ctx.dataContext.set(path, value);
  }

  private executeSetComponent(config: Record<string, unknown>, extra?: Record<string, unknown>): void {
    const componentId = String(this.resolve(config.componentId, extra));
    const prop = String(this.resolve(config.prop, extra));
    const value = this.resolve(config.value, extra);
    const component = this.ctx.getComponent(componentId);
    if (component) {
      component.setProps({ [prop]: value });
    }
  }

  private async executeHttp(action: ActionDefinition, extra?: Record<string, unknown>): Promise<void> {
    const config = action.config;
    const method = String(config.method || 'GET');
    const url = String(this.resolve(config.url, extra));
    const headers = config.headers ? (this.resolve(config.headers, extra) as Record<string, string>) : {};
    const body = config.body ? this.resolve(config.body, extra) : undefined;

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let data: unknown = await response.json();

    // 提取路径
    if (config.responsePath) {
      const parts = String(config.responsePath).split('.');
      for (const part of parts) {
        data = (data as any)?.[part];
      }
    }

    // 存储到变量
    if (config.statePath) {
      this.ctx.dataContext.set(String(config.statePath), data);
    }
  }

  private executeNavigate(config: Record<string, unknown>, extra?: Record<string, unknown>): void {
    const url = String(this.resolve(config.url, extra));
    const target = String(config.target || '_self');
    let finalUrl = url;
    if (config.params) {
      const params = this.resolve(config.params, extra) as Record<string, string>;
      const search = new URLSearchParams(params).toString();
      finalUrl += (url.includes('?') ? '&' : '?') + search;
    }
    this.ctx.navigate(finalUrl, target);
  }

  private executeShowMessage(config: Record<string, unknown>, extra?: Record<string, unknown>): void {
    const content = String(this.resolve(config.content, extra));
    const type = String(config.type || 'info');
    const duration = Number(config.duration || 3000);
    this.ctx.showMessage(content, type, duration);
  }

  private async executeCondition(action: ActionDefinition, extra?: Record<string, unknown>): Promise<void> {
    const result = this.evaluate(action.config.expression, extra);
    if (result && action.children?.length) {
      await this.executeChain(action.children, extra);
    } else if (!result && action.onSuccess?.length) {
      // else 分支放在 onSuccess 里
      await this.executeChain(action.onSuccess, extra);
    }
  }

  private async executeLoop(action: ActionDefinition, extra?: Record<string, unknown>): Promise<void> {
    const dataSource = this.resolve(action.config.dataSource, extra) as unknown[];
    if (!Array.isArray(dataSource) || !action.children?.length) return;

    const itemName = String(action.config.itemName || 'item');
    const indexName = String(action.config.indexName || 'index');

    for (let i = 0; i < dataSource.length; i++) {
      const loopContext = {
        ...extra,
        [itemName]: dataSource[i],
        [indexName]: i,
      };
      await this.executeChain(action.children, loopContext);
    }
  }

  private async executeDelay(config: Record<string, unknown>): Promise<void> {
    const duration = Number(config.duration || 1000);
    await new Promise((resolve) => setTimeout(resolve, duration));
  }

  private executeScript(config: Record<string, unknown>, extra?: Record<string, unknown>): void {
    const code = String(config.code);
    const data = this.ctx.dataContext.getAll();
    try {
      const fn = new Function('data', 'context', 'extra', code);
      fn(data, this.ctx, extra);
    } catch (e) {
      console.error('[ActionExecutor] Script error:', e);
    }
  }

  private executeDownload(config: Record<string, unknown>, extra?: Record<string, unknown>): void {
    const data = this.resolve(config.data, extra);
    const filename = String(config.filename || 'download.json');
    const mimeType = String(config.mimeType || 'application/json');

    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── 工具方法 ────────────────────────────────────────────

  private resolve(value: unknown, extra?: Record<string, unknown>): unknown {
    if (typeof value !== 'string') return value;
    const allContext = { ...this.ctx.dataContext.getAll(), ...extra };
    // 解析 {{expression}}
    return value.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
      try {
        const keys = Object.keys(allContext);
        const values = keys.map((k) => allContext[k]);
        const fn = new Function(...keys, `return (${expr})`);
        const result = fn(...values);
        return result == null ? '' : String(result);
      } catch {
        return '';
      }
    });
  }

  private evaluate(expression: unknown, extra?: Record<string, unknown>): boolean {
    if (typeof expression !== 'string') return Boolean(expression);
    const allContext = { ...this.ctx.dataContext.getAll(), ...extra };
    try {
      const keys = Object.keys(allContext);
      const values = keys.map((k) => allContext[k]);
      const fn = new Function(...keys, `return !!(${expression})`);
      return fn(...values);
    } catch {
      return false;
    }
  }
}

// ─── 事件管理器 ────────────────────────────────────────────

export class EventManager {
  private events = new Map<string, EventDefinition>();
  private executor: ActionExecutor;
  private timers = new Map<string, number>();
  private history: Array<{ eventId: string; timestamp: number; payload?: unknown }> = [];

  constructor(executor: ActionExecutor) {
    this.executor = executor;
  }

  /** 注册事件 */
  register(event: EventDefinition): void {
    this.events.set(event.id, event);
  }

  /** 注销事件 */
  unregister(id: string): void {
    this.events.delete(id);
    if (this.timers.has(id)) {
      clearTimeout(this.timers.get(id));
      this.timers.delete(id);
    }
  }

  /** 触发事件 */
  async trigger(eventId: string, payload?: unknown): Promise<void> {
    const event = this.events.get(eventId);
    if (!event || event.disabled) return;

    // 条件检查
    if (event.condition) {
      // 条件检查在执行器中处理
    }

    // 防抖
    if (event.debounce) {
      if (this.timers.has(eventId)) {
        clearTimeout(this.timers.get(eventId));
      }
      this.timers.set(
        eventId,
        window.setTimeout(() => {
          this.executeEvent(event, payload);
          this.timers.delete(eventId);
        }, event.debounce)
      );
      return;
    }

    // 节流
    if (event.throttle) {
      if (this.timers.has(eventId)) return;
      this.executeEvent(event, payload);
      this.timers.set(
        eventId,
        window.setTimeout(() => this.timers.delete(eventId), event.throttle)
      );
      return;
    }

    await this.executeEvent(event, payload);
  }

  /** 按事件名触发 */
  async triggerByName(eventName: string, source: string, payload?: unknown): Promise<void> {
    for (const event of this.events.values()) {
      if (event.name === eventName && event.source === source) {
        await this.trigger(event.id, payload);
      }
    }
  }

  private async executeEvent(event: EventDefinition, payload?: unknown): Promise<void> {
    // 记录历史
    this.history.push({ eventId: event.id, timestamp: Date.now(), payload });
    if (this.history.length > 200) this.history.shift();

    // 执行动作链
    await this.executor.executeChain(event.actions, { event: payload });
  }

  /** 获取事件历史 */
  getHistory(): Array<{ eventId: string; timestamp: number; payload?: unknown }> {
    return [...this.history];
  }

  /** 获取所有事件 */
  getAll(): EventDefinition[] {
    return Array.from(this.events.values());
  }

  /** 获取事件 */
  get(id: string): EventDefinition | undefined {
    return this.events.get(id);
  }

  destroy(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.events.clear();
    this.timers.clear();
    this.history = [];
  }
}
