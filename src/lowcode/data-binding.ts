/**
 * 数据绑定引擎 - 低代码平台的数据驱动核心
 *
 * 功能：
 * - 变量绑定 (state/props/context)
 * - 表达式解析与计算
 * - 数据链路追踪
 * - 响应式更新
 * - 数据转换管道
 * - 安全沙箱执行
 */

import { uid } from '../core/converter';

// ─── 绑定类型 ──────────────────────────────────────────────

export type BindingType = 'static' | 'variable' | 'expression' | 'formula' | 'pipe';

export interface DataBinding {
  type: BindingType;
  /** 变量路径，如 "user.name"、"list[0].title" */
  path?: string;
  /** 表达式，如 "{{price * quantity}}"、"{{items.length > 0}}" */
  expression?: string;
  /** 管道链 */
  pipes?: PipeOperation[];
  /** 静态值 */
  value?: unknown;
  /** 默认值 */
  fallback?: unknown;
}

export interface PipeOperation {
  name: string;
  args?: unknown[];
}

// ─── 数据上下文 ────────────────────────────────────────────

export class DataContext {
  private data: Record<string, unknown> = {};
  private listeners = new Map<string, Set<(value: unknown) => void>>();
  private history: Array<{ key: string; value: unknown; timestamp: number }> = [];
  private maxHistory = 100;

  constructor(initialData?: Record<string, unknown>) {
    if (initialData) this.data = { ...initialData };
  }

  /** 获取值 */
  get(path: string): unknown {
    return this.resolvePath(this.data, path);
  }

  /** 设置值 */
  set(path: string, value: unknown): void {
    const old = this.get(path);
    this.setPath(this.data, path, value);

    // 记录历史
    this.history.push({ key: path, value: old, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();

    // 通知监听
    this.notify(path, value);
  }

  /** 批量更新 */
  merge(data: Record<string, unknown>): void {
    Object.assign(this.data, data);
    for (const key of Object.keys(data)) {
      this.notify(key, data[key]);
    }
  }

  /** 获取全部数据 */
  getAll(): Record<string, unknown> {
    return { ...this.data };
  }

  /** 监听变化 */
  watch(path: string, callback: (value: unknown) => void): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path)!.add(callback);
    return () => this.listeners.get(path)?.delete(callback);
  }

  /** 监听任意路径 */
  watchAny(callback: (path: string, value: unknown) => void): () => void {
    const key = '*';
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    const wrapped = (value: unknown) => callback('*', value);
    this.listeners.get(key)!.add(wrapped as any);
    return () => this.listeners.get(key)?.delete(wrapped as any);
  }

  private notify(path: string, value: unknown): void {
    // 通知精确路径
    this.listeners.get(path)?.forEach((cb) => cb(value));
    // 通知通配符
    this.listeners.get('*')?.forEach((cb) => (cb as any)(path, value));
    // 通知父路径 (如 "user" 变化时通知 "user.name")
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      this.listeners.get(parentPath)?.forEach((cb) => cb(this.get(parentPath)));
    }
  }

  /** 路径解析 */
  private resolvePath(obj: any, path: string): unknown {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  }

  /** 路径设置 */
  private setPath(obj: any, path: string, value: unknown): void {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const next = parts[i + 1];
      const isIndex = /^\d+$/.test(next);
      if (current[part] == null) {
        current[part] = isIndex ? [] : {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }

  /** 恢复历史 */
  undo(): void {
    const entry = this.history.pop();
    if (entry) {
      this.setPath(this.data, entry.key, entry.value);
      this.notify(entry.key, entry.value);
    }
  }

  /** 快照 */
  snapshot(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(this.data));
  }

  /** 恢复快照 */
  restore(snapshot: Record<string, unknown>): void {
    this.data = JSON.parse(JSON.stringify(snapshot));
    // 通知所有
    this.listeners.forEach((callbacks, path) => {
      callbacks.forEach((cb) => cb(this.get(path)));
    });
  }

  destroy(): void {
    this.listeners.clear();
    this.history = [];
  }
}

// ─── 表达式引擎 ────────────────────────────────────────────

/** 内置管道函数 */
const BUILT_IN_PIPES: Record<string, (value: unknown, ...args: unknown[]) => unknown> = {
  // 字符串
  uppercase: (v) => String(v).toUpperCase(),
  lowercase: (v) => String(v).toLowerCase(),
  capitalize: (v) => {
    const s = String(v);
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
  truncate: (v, len) => {
    const s = String(v);
    const n = Number(len) || 50;
    return s.length > n ? s.slice(0, n) + '...' : s;
  },
  trim: (v) => String(v).trim(),
  replace: (v, search, replace) => String(v).replace(String(search), String(replace)),
  split: (v, sep) => String(v).split(String(sep)),
  join: (v, sep) => Array.isArray(v) ? v.join(String(sep)) : v,

  // 数字
  number: (v) => Number(v),
  fixed: (v, digits) => Number(v).toFixed(Number(digits) || 2),
  ceil: (v) => Math.ceil(Number(v)),
  floor: (v) => Math.floor(Number(v)),
  round: (v) => Math.round(Number(v)),
  abs: (v) => Math.abs(Number(v)),
  formatNumber: (v) => {
    const n = Number(v);
    if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return n.toLocaleString();
  },

  // 日期
  date: (v, format) => {
    const d = new Date(v as any);
    if (isNaN(d.getTime())) return '';
    const fmt = String(format || 'YYYY-MM-DD');
    return fmt
      .replace('YYYY', String(d.getFullYear()))
      .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
      .replace('DD', String(d.getDate()).padStart(2, '0'))
      .replace('HH', String(d.getHours()).padStart(2, '0'))
      .replace('mm', String(d.getMinutes()).padStart(2, '0'))
      .replace('ss', String(d.getSeconds()).padStart(2, '0'));
  },
  fromNow: (v) => {
    const d = new Date(v as any);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前';
    return d.toLocaleDateString();
  },

  // 数组
  length: (v) => (Array.isArray(v) || typeof v === 'string' ? v.length : 0),
  first: (v) => (Array.isArray(v) ? v[0] : v),
  last: (v) => (Array.isArray(v) ? v[v.length - 1] : v),
  unique: (v) => (Array.isArray(v) ? [...new Set(v)] : v),
  sort: (v, key) => {
    if (!Array.isArray(v)) return v;
    return [...v].sort((a, b) => {
      const k = String(key || '');
      const va = k ? a[k] : a;
      const vb = k ? b[k] : b;
      return va > vb ? 1 : va < vb ? -1 : 0;
    });
  },
  reverse: (v) => (Array.isArray(v) ? [...v].reverse() : v),
  filter: (v, key, value) => {
    if (!Array.isArray(v)) return v;
    const k = String(key);
    return v.filter((item) => item[k] === value);
  },
  map: (v, key) => {
    if (!Array.isArray(v)) return v;
    const k = String(key || '');
    return v.map((item) => (k ? item[k] : item));
  },
  sum: (v, key) => {
    if (!Array.isArray(v)) return 0;
    const k = String(key || '');
    return v.reduce((s, item) => s + Number(k ? item[k] : item), 0);
  },
  groupBy: (v, key) => {
    if (!Array.isArray(v)) return v;
    const k = String(key);
    return v.reduce((groups, item) => {
      const gk = item[k];
      (groups[gk] = groups[gk] || []).push(item);
      return groups;
    }, {} as Record<string, unknown[]>);
  },

  // 条件
  default: (v, fallback) => (v == null || v === '' ? fallback : v),
  boolean: (v) => Boolean(v),
  json: (v) => JSON.stringify(v),
  parse: (v) => { try { return JSON.parse(String(v)); } catch { return v; } },
  coalesce: (...args) => args.find((v) => v != null),
};

/** 注册自定义管道 */
const customPipes = new Map<string, (...args: unknown[]) => unknown>();

export function registerPipe(name: string, fn: (...args: unknown[]) => unknown): void {
  customPipes.set(name, fn);
}

/** 执行管道 */
export function executePipe(value: unknown, operations: PipeOperation[]): unknown {
  let result = value;
  for (const op of operations) {
    const pipe = customPipes.get(op.name) || BUILT_IN_PIPES[op.name];
    if (!pipe) {
      console.warn(`[DataBinding] Unknown pipe: ${op.name}`);
      continue;
    }
    result = pipe(result, ...(op.args ?? []));
  }
  return result;
}

// ─── 表达式解析 ────────────────────────────────────────────

/**
 * 解析绑定值：{{expression}} 或 ${path}
 */
export function parseBinding(input: string): DataBinding | null {
  if (!input || typeof input !== 'string') return null;

  // 管道表达式：{{ expr | pipe1 | pipe2(arg) }}
  const pipeMatch = input.match(/^\{\{\s*(.+?)\s*\}\}$/);
  if (pipeMatch) {
    const expr = pipeMatch[1];
    const parts = expr.split('|').map((p) => p.trim());
    const mainExpr = parts[0];
    const pipes: PipeOperation[] = parts.slice(1).map((p) => {
      const fnMatch = p.match(/^(\w+)(?:\((.+)\))?$/);
      if (fnMatch) {
        const args = fnMatch[2]
          ? fnMatch[2].split(',').map((a) => {
              const trimmed = a.trim();
              if (/^['"]/.test(trimmed)) return trimmed.slice(1, -1);
              if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
              if (trimmed === 'true') return true;
              if (trimmed === 'false') return false;
              return trimmed;
            })
          : [];
        return { name: fnMatch[1], args };
      }
      return { name: p };
    });

    // 简单变量路径
    if (/^[\w.]+$/.test(mainExpr)) {
      return { type: 'variable', path: mainExpr, pipes: pipes.length ? pipes : undefined };
    }

    return { type: 'expression', expression: mainExpr, pipes: pipes.length ? pipes : undefined };
  }

  // $变量引用
  const varMatch = input.match(/^\$\{([\w.[\]]+)\}$/);
  if (varMatch) {
    return { type: 'variable', path: varMatch[1] };
  }

  return null;
}

/**
 * 安全执行表达式（沙箱）
 */
export function evaluateExpression(
  expression: string,
  context: Record<string, unknown>,
  fallback?: unknown
): unknown {
  try {
    // 简单的沙箱：只允许访问 context 中的变量
    const keys = Object.keys(context);
    const values = keys.map((k) => context[k]);

    // 将表达式中的变量替换为函数参数
    // 限制：不能访问 window、document、eval 等
    const safeExpr = expression
      .replace(/\b(window|document|eval|Function|setTimeout|setInterval|fetch|XMLHttpRequest)\b/g, 'undefined');

    const fn = new Function(...keys, `"use strict"; return (${safeExpr});`);
    const result = fn(...values);

    return result === undefined ? fallback : result;
  } catch (e) {
    console.warn(`[DataBinding] Expression error: "${expression}"`, e);
    return fallback;
  }
}

/**
 * 解析并执行绑定
 */
export function resolveBinding(binding: DataBinding, context: DataContext): unknown {
  let value: unknown;

  switch (binding.type) {
    case 'static':
      value = binding.value;
      break;
    case 'variable':
      value = binding.path ? context.get(binding.path) : undefined;
      break;
    case 'expression':
    case 'formula':
      value = binding.expression
        ? evaluateExpression(binding.expression, context.getAll())
        : undefined;
      break;
    default:
      value = binding.value;
  }

  // 执行管道
  if (binding.pipes?.length) {
    value = executePipe(value, binding.pipes);
  }

  // 兜底值
  if (value === undefined || value === null) {
    value = binding.fallback;
  }

  return value;
}

/**
 * 解析文本中的所有绑定：支持 "Hello {{user.name}}, you have {{count}} items"
 */
export function resolveTemplate(template: string, context: DataContext): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
    const binding = parseBinding(`{{${expr}}}`);
    if (!binding) return '';
    const value = resolveBinding(binding, context);
    return value == null ? '' : String(value);
  });
}

// ─── 数据转换管道 ──────────────────────────────────────────

export class DataPipeline {
  private steps: Array<{ name: string; fn: (data: unknown) => unknown }> = [];

  add(name: string, fn: (data: unknown) => unknown): this {
    this.steps.push({ name, fn });
    return this;
  }

  execute(input: unknown): unknown {
    let result = input;
    for (const step of this.steps) {
      result = step.fn(result);
    }
    return result;
  }

  clear(): void {
    this.steps = [];
  }
}

// ─── 绑定解析器工具 ────────────────────────────────────────

/** 从 WidgetConfig 中提取所有绑定 */
export function extractBindings(config: Record<string, unknown>): Array<{ path: string; binding: DataBinding }> {
  const bindings: Array<{ path: string; binding: DataBinding }> = [];

  function walk(obj: any, currentPath: string): void {
    if (typeof obj === 'string') {
      const binding = parseBinding(obj);
      if (binding) {
        bindings.push({ path: currentPath, binding });
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, `${currentPath}[${i}]`));
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        walk(value, currentPath ? `${currentPath}.${key}` : key);
      }
    }
  }

  walk(config, '');
  return bindings;
}

/** 替换配置中的绑定值 */
export function applyBindings(
  config: Record<string, unknown>,
  context: DataContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      const binding = parseBinding(value);
      if (binding) {
        result[key] = resolveBinding(binding, context);
      } else if (value.includes('{{')) {
        result[key] = resolveTemplate(value, context);
      } else {
        result[key] = value;
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === 'object' && item !== null) {
          return applyBindings(item as Record<string, unknown>, context);
        }
        return item;
      });
    } else if (value && typeof value === 'object') {
      result[key] = applyBindings(value as Record<string, unknown>, context);
    } else {
      result[key] = value;
    }
  }

  return result;
}
