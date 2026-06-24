/**
 * 脚本/逻辑编辑器 - 低代码平台的脚本能力
 *
 * 功能：
 * - 代码片段管理
 * - 生命周期钩子
 * - 自定义函数注册
 * - 脚本模板库
 * - 沙箱执行
 */

import { uid } from '../core/converter';

// ─── 脚本定义 ──────────────────────────────────────────────

export type ScriptTrigger =
  | 'pageLoad'
  | 'pageShow'
  | 'pageHide'
  | 'pageUnload'
  | 'componentMount'
  | 'componentUpdate'
  | 'componentUnmount'
  | 'beforeAction'
  | 'afterAction'
  | 'onError'
  | 'onDataChange'
  | 'onResize'
  | 'onVisibilityChange'
  | 'onNetworkChange'
  | 'custom';

export interface ScriptDefinition {
  id: string;
  name: string;
  description?: string;
  trigger: ScriptTrigger;
  /** 触发条件 (表达式) */
  condition?: string;
  /** 执行优先级 (越小越先执行) */
  priority?: number;
  /** 是否异步 */
  async?: boolean;
  /** 代码 */
  code: string;
  /** 参数定义 */
  params?: Array<{ name: string; type: string; default?: unknown; description?: string }>;
  /** 返回值类型 */
  returnType?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 标签 */
  tags?: string[];
}

// ─── 脚本模板 ──────────────────────────────────────────────

export interface ScriptTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  code: string;
  params?: Array<{ name: string; type: string; default?: unknown }>;
  tags?: string[];
}

const BUILT_IN_TEMPLATES: ScriptTemplate[] = [
  // 数据处理
  {
    id: 'tpl_format_number',
    name: '格式化数字',
    category: '数据处理',
    description: '将数字格式化为千分位',
    code: `// 格式化数字为千分位
function formatNumber(num) {
  if (num == null) return '0';
  return Number(num).toLocaleString('zh-CN');
}
return formatNumber(value);`,
    params: [{ name: 'value', type: 'number' }],
  },
  {
    id: 'tpl_format_date',
    name: '格式化日期',
    category: '数据处理',
    description: '格式化日期时间',
    code: `// 格式化日期
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return format
    .replace('YYYY', d.getFullYear())
    .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
    .replace('DD', String(d.getDate()).padStart(2, '0'))
    .replace('HH', String(d.getHours()).padStart(2, '0'))
    .replace('mm', String(d.getMinutes()).padStart(2, '0'))
    .replace('ss', String(d.getSeconds()).padStart(2, '0'));
}
return formatDate(date, format);`,
    params: [{ name: 'date', type: 'string' }, { name: 'format', type: 'string', default: 'YYYY-MM-DD' }],
  },
  {
    id: 'tpl_array_group',
    name: '数组分组',
    category: '数据处理',
    description: '按指定字段对数组分组',
    code: `// 数组按字段分组
function groupBy(arr, key) {
  if (!Array.isArray(arr)) return {};
  return arr.reduce((groups, item) => {
    const k = item[key];
    (groups[k] = groups[k] || []).push(item);
    return groups;
  }, {});
}
return groupBy(list, field);`,
    params: [{ name: 'list', type: 'array' }, { name: 'field', type: 'string' }],
  },
  {
    id: 'tpl_array_sort',
    name: '数组排序',
    category: '数据处理',
    description: '按指定字段排序',
    code: `// 数组排序
function sortArray(arr, key, order = 'asc') {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => {
    const va = key ? a[key] : a;
    const vb = key ? b[key] : b;
    return order === 'desc' ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
  });
}
return sortArray(list, field, order);`,
    params: [{ name: 'list', type: 'array' }, { name: 'field', type: 'string' }, { name: 'order', type: 'string', default: 'asc' }],
  },

  // 校验
  {
    id: 'tpl_validate_email',
    name: '邮箱校验',
    category: '表单校验',
    description: '校验邮箱格式',
    code: `return /^[\\w.-]+@[\\w.-]+\\.\\w+$/.test(email);`,
    params: [{ name: 'email', type: 'string' }],
  },
  {
    id: 'tpl_validate_phone',
    name: '手机号校验',
    category: '表单校验',
    description: '校验手机号格式',
    code: `return /^1[3-9]\\d{9}$/.test(phone);`,
    params: [{ name: 'phone', type: 'string' }],
  },
  {
    id: 'tpl_validate_idcard',
    name: '身份证校验',
    category: '表单校验',
    description: '校验身份证号',
    code: `function validateIdCard(id) {
  if (!/^\\d{17}[\\dXx]$/.test(id)) return false;
  const weights = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
  const checks = '10X98765432';
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(id[i]) * weights[i];
  return checks[sum % 11] === id[17].toUpperCase();
}
return validateIdCard(idCard);`,
    params: [{ name: 'idCard', type: 'string' }],
  },

  // UI 交互
  {
    id: 'tpl_confirm_action',
    name: '确认操作',
    category: 'UI 交互',
    description: '执行前弹出确认框',
    code: `// 在执行动作前确认
const confirmed = await new Promise(resolve => {
  if (typeof window !== 'undefined' && window.confirm) {
    resolve(window.confirm(message || '确定执行此操作？'));
  } else {
    resolve(true);
  }
});
if (!confirmed) return false;
// 继续执行后续逻辑
return true;`,
    params: [{ name: 'message', type: 'string', default: '确定执行此操作？' }],
  },
  {
    id: 'tpl_copy_clipboard',
    name: '复制到剪贴板',
    category: 'UI 交互',
    description: '复制文本到剪贴板',
    code: `try {
  await navigator.clipboard.writeText(text);
  return true;
} catch (e) {
  // fallback
  const input = document.createElement('textarea');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  return true;
}`,
    params: [{ name: 'text', type: 'string' }],
  },

  // 网络
  {
    id: 'tpl_fetch_api',
    name: 'API 请求封装',
    category: '网络请求',
    description: '封装 fetch 请求',
    code: `async function request(url, options = {}) {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    
    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    return await response.json();
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}
return request(url, { method, headers, body });`,
    params: [
      { name: 'url', type: 'string' },
      { name: 'method', type: 'string', default: 'GET' },
      { name: 'headers', type: 'object', default: {} },
      { name: 'body', type: 'any' },
    ],
  },

  // 工具函数
  {
    id: 'tpl_debounce',
    name: '防抖函数',
    category: '工具函数',
    description: '创建防抖函数',
    code: `function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
// 使用: const debouncedFn = debounce(yourFunction, 300);
return debounce(fn, delay);`,
    params: [{ name: 'fn', type: 'function' }, { name: 'delay', type: 'number', default: 300 }],
  },
  {
    id: 'tpl_throttle',
    name: '节流函数',
    category: '工具函数',
    description: '创建节流函数',
    code: `function throttle(fn, interval = 300) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      return fn.apply(this, args);
    }
  };
}
return throttle(fn, interval);`,
    params: [{ name: 'fn', type: 'function' }, { name: 'interval', type: 'number', default: 300 }],
  },
  {
    id: 'tpl_deep_clone',
    name: '深拷贝',
    category: '工具函数',
    description: '深拷贝对象',
    code: `function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}
return deepClone(obj);`,
    params: [{ name: 'obj', type: 'any' }],
  },
  {
    id: 'tpl_local_storage',
    name: 'LocalStorage 存取',
    category: '工具函数',
    description: '安全的 LocalStorage 操作',
    code: `const storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch { return defaultValue; }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};
if (action === 'get') return storage.get(key, defaultValue);
if (action === 'set') return storage.set(key, value);
if (action === 'remove') return storage.remove(key);`,
    params: [
      { name: 'action', type: 'string' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'any' },
      { name: 'defaultValue', type: 'any' },
    ],
  },
];

// ─── 脚本管理器 ────────────────────────────────────────────

export class ScriptManager {
  private scripts = new Map<string, ScriptDefinition>();
  private templates: ScriptTemplate[] = [...BUILT_IN_TEMPLATES];
  private customFunctions = new Map<string, Function>();
  private executionLog: Array<{ scriptId: string; timestamp: number; duration: number; success: boolean; error?: string }> = [];

  // ─── 脚本管理 ──────────────────────────────────────────

  /** 注册脚本 */
  register(script: ScriptDefinition): void {
    this.scripts.set(script.id, { ...script, enabled: script.enabled !== false });
  }

  /** 批量注册 */
  registerAll(scripts: ScriptDefinition[]): void {
    scripts.forEach((s) => this.register(s));
  }

  /** 注销脚本 */
  unregister(id: string): void {
    this.scripts.delete(id);
  }

  /** 获取脚本 */
  get(id: string): ScriptDefinition | undefined {
    return this.scripts.get(id);
  }

  /** 获取所有脚本 */
  getAll(): ScriptDefinition[] {
    return Array.from(this.scripts.values());
  }

  /** 按触发器获取 */
  getByTrigger(trigger: ScriptTrigger): ScriptDefinition[] {
    return Array.from(this.scripts.values())
      .filter((s) => s.trigger === trigger && s.enabled !== false)
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
  }

  /** 启用/禁用 */
  setEnabled(id: string, enabled: boolean): void {
    const script = this.scripts.get(id);
    if (script) script.enabled = enabled;
  }

  // ─── 脚本执行 ──────────────────────────────────────────

  /** 执行脚本 */
  async execute(id: string, context: Record<string, unknown> = {}): Promise<unknown> {
    const script = this.scripts.get(id);
    if (!script || script.enabled === false) return undefined;

    // 条件检查
    if (script.condition) {
      try {
        const result = this.evaluateExpression(script.condition, context);
        if (!result) return undefined;
      } catch { return undefined; }
    }

    const startTime = performance.now();
    try {
      const result = script.async
        ? await this.executeCode(script.code, context)
        : this.executeCode(script.code, context);

      this.executionLog.push({
        scriptId: id,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        success: true,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.executionLog.push({
        scriptId: id,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        success: false,
        error: errorMsg,
      });
      throw error;
    }
  }

  /** 执行指定触发器的所有脚本 */
  async executeTrigger(trigger: ScriptTrigger, context: Record<string, unknown> = {}): Promise<void> {
    const scripts = this.getByTrigger(trigger);
    for (const script of scripts) {
      try {
        await this.execute(script.id, context);
      } catch (error) {
        console.error(`[ScriptManager] Script "${script.name}" failed:`, error);
      }
    }
  }

  /** 执行代码字符串 */
  executeCode(code: string, context: Record<string, unknown> = {}): unknown {
    const allContext = { ...context };

    // 注入自定义函数
    for (const [name, fn] of this.customFunctions) {
      allContext[name] = fn;
    }

    const keys = Object.keys(allContext);
    const values = keys.map((k) => allContext[k]);

    try {
      const fn = new Function(...keys, `"use strict";\n${code}`);
      return fn(...values);
    } catch (error) {
      console.error('[ScriptManager] Execution error:', error);
      throw error;
    }
  }

  // ─── 自定义函数 ──────────────────────────────────────────

  /** 注册全局函数 */
  registerFunction(name: string, fn: Function): void {
    this.customFunctions.set(name, fn);
  }

  /** 注销全局函数 */
  unregisterFunction(name: string): void {
    this.customFunctions.delete(name);
  }

  /** 获取所有自定义函数名 */
  getFunctionNames(): string[] {
    return Array.from(this.customFunctions.keys());
  }

  // ─── 模板 ──────────────────────────────────────────────

  /** 获取模板 */
  getTemplates(): ScriptTemplate[] {
    return [...this.templates];
  }

  /** 按分类获取模板 */
  getTemplatesByCategory(category: string): ScriptTemplate[] {
    return this.templates.filter((t) => t.category === category);
  }

  /** 获取模板分类 */
  getTemplateCategories(): string[] {
    return [...new Set(this.templates.map((t) => t.category))];
  }

  /** 添加自定义模板 */
  addTemplate(template: ScriptTemplate): void {
    this.templates.push(template);
  }

  /** 从模板创建脚本 */
  createFromTemplate(templateId: string, params?: Record<string, unknown>): ScriptDefinition | undefined {
    const template = this.templates.find((t) => t.id === templateId);
    if (!template) return undefined;

    let code = template.code;
    // 参数替换
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        code = code.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(value));
      }
    }

    return {
      id: uid(),
      name: template.name,
      trigger: 'custom',
      code,
      params: template.params,
      enabled: true,
      tags: template.tags,
    };
  }

  // ─── 执行日志 ──────────────────────────────────────────

  /** 获取执行日志 */
  getExecutionLog(): Array<{ scriptId: string; timestamp: number; duration: number; success: boolean; error?: string }> {
    return [...this.executionLog];
  }

  /** 清空日志 */
  clearExecutionLog(): void {
    this.executionLog = [];
  }

  // ─── 序列化 ──────────────────────────────────────────────

  /** 导出所有脚本 */
  export(): string {
    return JSON.stringify(Array.from(this.scripts.values()), null, 2);
  }

  /** 导入脚本 */
  import(json: string): void {
    const scripts: ScriptDefinition[] = JSON.parse(json);
    scripts.forEach((s) => this.register(s));
  }

  // ─── 工具 ────────────────────────────────────────────────

  private evaluateExpression(expression: string, context: Record<string, unknown>): boolean {
    const keys = Object.keys(context);
    const values = keys.map((k) => context[k]);
    try {
      const fn = new Function(...keys, `return !!(${expression})`);
      return fn(...values);
    } catch {
      return false;
    }
  }

  destroy(): void {
    this.scripts.clear();
    this.customFunctions.clear();
    this.executionLog = [];
  }
}
