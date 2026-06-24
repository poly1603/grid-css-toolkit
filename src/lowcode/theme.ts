/**
 * 主题系统 - 全局主题变量 + 组件主题包
 */

import { uid } from '../core/converter';

// ─── 主题变量 ──────────────────────────────────────────────

export interface ThemeVariable {
  name: string;
  label: string;
  type: 'color' | 'size' | 'font' | 'spacing' | 'shadow' | 'radius' | 'number' | 'string';
  value: string;
  default: string;
  description?: string;
  group?: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  icon: string;
  description?: string;
  variables: Record<string, string>;
}

export interface ThemeConfig {
  /** 主题名称 */
  name: string;
  /** CSS 变量前缀 */
  prefix: string;
  /** 变量定义 */
  variables: Record<string, string>;
  /** 预设 */
  presets: ThemePreset[];
  /** 自定义字体 */
  fonts?: Array<{ name: string; url: string; weight?: string }>;
}

// ─── 内置主题变量 ──────────────────────────────────────────

const DEFAULT_VARIABLES: ThemeVariable[] = [
  // 颜色
  { name: '--primary', label: '主色', type: 'color', value: '#4f8ff7', default: '#4f8ff7', group: '颜色' },
  { name: '--primary-hover', label: '主色悬停', type: 'color', value: '#3a7be0', default: '#3a7be0', group: '颜色' },
  { name: '--primary-light', label: '主色浅', type: 'color', value: 'rgba(79,143,247,0.1)', default: 'rgba(79,143,247,0.1)', group: '颜色' },
  { name: '--success', label: '成功色', type: 'color', value: '#22c55e', default: '#22c55e', group: '颜色' },
  { name: '--warning', label: '警告色', type: 'color', value: '#f59e0b', default: '#f59e0b', group: '颜色' },
  { name: '--danger', label: '危险色', type: 'color', value: '#ef4444', default: '#ef4444', group: '颜色' },
  { name: '--info', label: '信息色', type: 'color', value: '#3b82f6', default: '#3b82f6', group: '颜色' },

  // 背景
  { name: '--bg', label: '背景色', type: 'color', value: '#ffffff', default: '#ffffff', group: '背景' },
  { name: '--bg-secondary', label: '次级背景', type: 'color', value: '#f8fafc', default: '#f8fafc', group: '背景' },
  { name: '--bg-tertiary', label: '三级背景', type: 'color', value: '#f1f5f9', default: '#f1f5f9', group: '背景' },
  { name: '--bg-overlay', label: '遮罩背景', type: 'color', value: 'rgba(0,0,0,0.5)', default: 'rgba(0,0,0,0.5)', group: '背景' },

  // 文字
  { name: '--text', label: '文字色', type: 'color', value: '#1e293b', default: '#1e293b', group: '文字' },
  { name: '--text-secondary', label: '次级文字', type: 'color', value: '#64748b', default: '#64748b', group: '文字' },
  { name: '--text-muted', label: '弱化文字', type: 'color', value: '#94a3b8', default: '#94a3b8', group: '文字' },
  { name: '--text-inverse', label: '反色文字', type: 'color', value: '#ffffff', default: '#ffffff', group: '文字' },

  // 边框
  { name: '--border', label: '边框色', type: 'color', value: '#e2e8f0', default: '#e2e8f0', group: '边框' },
  { name: '--border-hover', label: '边框悬停', type: 'color', value: '#cbd5e1', default: '#cbd5e1', group: '边框' },

  // 间距
  { name: '--spacing-xs', label: '极小间距', type: 'spacing', value: '4px', default: '4px', group: '间距' },
  { name: '--spacing-sm', label: '小间距', type: 'spacing', value: '8px', default: '8px', group: '间距' },
  { name: '--spacing-md', label: '中间距', type: 'spacing', value: '16px', default: '16px', group: '间距' },
  { name: '--spacing-lg', label: '大间距', type: 'spacing', value: '24px', default: '24px', group: '间距' },
  { name: '--spacing-xl', label: '特大间距', type: 'spacing', value: '32px', default: '32px', group: '间距' },

  // 圆角
  { name: '--radius-sm', label: '小圆角', type: 'radius', value: '4px', default: '4px', group: '圆角' },
  { name: '--radius-md', label: '中圆角', type: 'radius', value: '8px', default: '8px', group: '圆角' },
  { name: '--radius-lg', label: '大圆角', type: 'radius', value: '12px', default: '12px', group: '圆角' },
  { name: '--radius-full', label: '全圆角', type: 'radius', value: '9999px', default: '9999px', group: '圆角' },

  // 阴影
  { name: '--shadow-sm', label: '小阴影', type: 'shadow', value: '0 1px 2px rgba(0,0,0,0.05)', default: '0 1px 2px rgba(0,0,0,0.05)', group: '阴影' },
  { name: '--shadow-md', label: '中阴影', type: 'shadow', value: '0 4px 6px rgba(0,0,0,0.1)', default: '0 4px 6px rgba(0,0,0,0.1)', group: '阴影' },
  { name: '--shadow-lg', label: '大阴影', type: 'shadow', value: '0 10px 15px rgba(0,0,0,0.1)', default: '0 10px 15px rgba(0,0,0,0.1)', group: '阴影' },

  // 字体
  { name: '--font-family', label: '字体', type: 'font', value: "system-ui, -apple-system, 'Segoe UI', sans-serif", default: "system-ui, -apple-system, 'Segoe UI', sans-serif", group: '字体' },
  { name: '--font-size-xs', label: '极小字号', type: 'size', value: '12px', default: '12px', group: '字体' },
  { name: '--font-size-sm', label: '小字号', type: 'size', value: '13px', default: '13px', group: '字体' },
  { name: '--font-size-md', label: '中字号', type: 'size', value: '14px', default: '14px', group: '字体' },
  { name: '--font-size-lg', label: '大字号', type: 'size', value: '16px', default: '16px', group: '字体' },
  { name: '--font-size-xl', label: '特大字号', type: 'size', value: '20px', default: '20px', group: '字体' },
  { name: '--font-size-2xl', label: '超大字号', type: 'size', value: '24px', default: '24px', group: '字体' },

  // 动画
  { name: '--transition-fast', label: '快速动画', type: 'string', value: '0.15s ease', default: '0.15s ease', group: '动画' },
  { name: '--transition-normal', label: '正常动画', type: 'string', value: '0.2s ease', default: '0.2s ease', group: '动画' },
  { name: '--transition-slow', label: '慢速动画', type: 'string', value: '0.3s ease', default: '0.3s ease', group: '动画' },
];

// ─── 内置预设 ──────────────────────────────────────────────

const BUILT_IN_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: '默认',
    icon: '🔵',
    description: '清新蓝色主题',
    variables: {
      '--primary': '#4f8ff7',
      '--primary-hover': '#3a7be0',
      '--bg': '#ffffff',
      '--text': '#1e293b',
    },
  },
  {
    id: 'dark',
    name: '暗夜',
    icon: '🌙',
    description: '深色护眼主题',
    variables: {
      '--primary': '#60a5fa',
      '--primary-hover': '#3b82f6',
      '--bg': '#0f172a',
      '--bg-secondary': '#1e293b',
      '--bg-tertiary': '#334155',
      '--text': '#f1f5f9',
      '--text-secondary': '#94a3b8',
      '--border': '#334155',
    },
  },
  {
    id: 'green',
    name: '翠绿',
    icon: '🟢',
    description: '清新绿色主题',
    variables: {
      '--primary': '#22c55e',
      '--primary-hover': '#16a34a',
      '--primary-light': 'rgba(34,197,94,0.1)',
    },
  },
  {
    id: 'purple',
    name: '星紫',
    icon: '🟣',
    description: '优雅紫色主题',
    variables: {
      '--primary': '#a855f7',
      '--primary-hover': '#9333ea',
      '--primary-light': 'rgba(168,85,247,0.1)',
    },
  },
  {
    id: 'orange',
    name: '暖阳',
    icon: '🟠',
    description: '活力橙色主题',
    variables: {
      '--primary': '#f97316',
      '--primary-hover': '#ea580c',
      '--primary-light': 'rgba(249,115,22,0.1)',
    },
  },
  {
    id: 'pink',
    name: '樱粉',
    icon: '🩷',
    description: '温柔粉色主题',
    variables: {
      '--primary': '#ec4899',
      '--primary-hover': '#db2777',
      '--primary-light': 'rgba(236,72,153,0.1)',
    },
  },
  {
    id: 'corporate',
    name: '商务',
    icon: '🏢',
    description: '专业商务主题',
    variables: {
      '--primary': '#1e40af',
      '--primary-hover': '#1e3a8a',
      '--primary-light': 'rgba(30,64,175,0.1)',
      '--radius-sm': '2px',
      '--radius-md': '4px',
      '--radius-lg': '6px',
    },
  },
];

// ─── 主题管理器 ────────────────────────────────────────────

export class ThemeManager {
  private config: ThemeConfig;
  private styleEl: HTMLStyleElement;
  private variables: Map<string, ThemeVariable>;
  private presets: ThemePreset[];
  private currentPreset: string | null = null;
  private onChange?: (variables: Record<string, string>) => void;

  constructor(prefix = 'gct-theme', initialPreset?: string) {
    this.variables = new Map(DEFAULT_VARIABLES.map((v) => [v.name, { ...v }]));
    this.presets = [...BUILT_IN_PRESETS];
    this.config = {
      name: 'default',
      prefix,
      variables: Object.fromEntries(DEFAULT_VARIABLES.map((v) => [v.name, v.value])),
      presets: this.presets,
    };

    // 创建样式元素
    this.styleEl = document.createElement('style');
    this.styleEl.id = `theme-${uid()}`;
    document.head.appendChild(this.styleEl);

    // 应用初始预设
    if (initialPreset) {
      this.applyPreset(initialPreset);
    } else {
      this.apply();
    }
  }

  /** 获取所有变量定义 */
  getVariables(): ThemeVariable[] {
    return Array.from(this.variables.values());
  }

  /** 按分组获取变量 */
  getVariablesByGroup(): Map<string, ThemeVariable[]> {
    const groups = new Map<string, ThemeVariable[]>();
    for (const v of this.variables.values()) {
      const group = v.group || '其他';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(v);
    }
    return groups;
  }

  /** 获取变量值 */
  get(name: string): string | undefined {
    return this.variables.get(name)?.value;
  }

  /** 设置变量 */
  set(name: string, value: string): void {
    const v = this.variables.get(name);
    if (v) {
      v.value = value;
      this.config.variables[name] = value;
      this.apply();
      this.onChange?.(this.config.variables);
    }
  }

  /** 批量设置 */
  setMany(vars: Record<string, string>): void {
    for (const [name, value] of Object.entries(vars)) {
      const v = this.variables.get(name);
      if (v) {
        v.value = value;
        this.config.variables[name] = value;
      }
    }
    this.apply();
    this.onChange?.(this.config.variables);
  }

  /** 重置单个变量 */
  reset(name: string): void {
    const v = this.variables.get(name);
    if (v) {
      v.value = v.default;
      this.config.variables[name] = v.default;
      this.apply();
    }
  }

  /** 重置全部 */
  resetAll(): void {
    for (const v of this.variables.values()) {
      v.value = v.default;
      this.config.variables[v.name] = v.default;
    }
    this.currentPreset = null;
    this.apply();
  }

  /** 应用预设 */
  applyPreset(presetId: string): void {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return;
    this.currentPreset = presetId;
    this.setMany(preset.variables);
  }

  /** 获取当前预设 */
  getCurrentPreset(): string | null {
    return this.currentPreset;
  }

  /** 获取所有预设 */
  getPresets(): ThemePreset[] {
    return [...this.presets];
  }

  /** 添加自定义预设 */
  addPreset(preset: ThemePreset): void {
    this.presets.push(preset);
    this.config.presets = this.presets;
  }

  /** 导出当前主题 */
  export(): string {
    return JSON.stringify({
      name: this.config.name,
      variables: this.config.variables,
      preset: this.currentPreset,
    }, null, 2);
  }

  /** 导入主题 */
  import(json: string): void {
    const data = JSON.parse(json);
    if (data.variables) this.setMany(data.variables);
    if (data.preset) this.applyPreset(data.preset);
  }

  /** 注册变化监听 */
  onChange_(callback: (variables: Record<string, string>) => void): void {
    this.onChange = callback;
  }

  /** 生成 CSS */
  private apply(): void {
    const vars = Object.entries(this.config.variables)
      .map(([name, value]) => `  ${name}: ${value};`)
      .join('\n');

    this.styleEl.textContent = `:root {\n${vars}\n}`;
  }

  /** 获取当前所有变量值 */
  getAllValues(): Record<string, string> {
    return { ...this.config.variables };
  }

  destroy(): void {
    this.styleEl.remove();
    this.variables.clear();
  }
}
