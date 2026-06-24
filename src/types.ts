/**
 * Grid CSS Toolkit - 核心类型定义
 */

// ─── 基础几何 ───────────────────────────────────────────────

/** 网格位置与尺寸 */
export interface GridRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** CSS Grid 线索引 (1-based) */
export interface CSSGridPlacement {
  columnStart: number;
  columnEnd: number;
  rowStart: number;
  rowEnd: number;
}

// ─── Widget 定义 ─────────────────────────────────────────────

/** Widget 内容类型 */
export type WidgetContentType = 'text' | 'html' | 'image' | 'component' | 'slot';

/** Widget 静态配置 (序列化用) */
export interface WidgetConfig {
  id: string;
  /** gridstack 位置 */
  rect: GridRect;
  /** 最小尺寸 */
  minW?: number;
  minH?: number;
  /** 最大尺寸 */
  maxW?: number;
  maxH?: number;
  /** 是否可拖拽 */
  noMove?: boolean;
  /** 是否可调整大小 */
  noResize?: boolean;
  /** 是否锁定 (同时禁止移动和缩放) */
  locked?: boolean;
  /** 自动放置 */
  autoPosition?: boolean;
  /** 内容类型 */
  contentType?: WidgetContentType;
  /** 内容 (文本/HTML/组件名/slot名) */
  content?: string;
  /** 自定义 CSS 类名 */
  className?: string;
  /** 自定义样式 (行内) */
  style?: Partial<CSSStyleDeclaration>;
  /** 自定义数据 */
  data?: Record<string, unknown>;
  /** 子 widget (嵌套网格) */
  subGrid?: GridConfig;
  /** 层级 */
  zIndex?: number;
  /** 是否可见 */
  visible?: boolean;
  /** 响应式覆盖 */
  responsive?: Record<string, Partial<GridRect>>;
}

// ─── 网格配置 ────────────────────────────────────────────────

/** 断点定义 */
export interface Breakpoint {
  name: string;
  minWidth?: number;
  maxWidth?: number;
  columns: number;
  cellHeight?: number;
  gap?: number;
  margin?: number | [number, number];
}

/** 响应式配置 */
export interface ResponsiveConfig {
  breakpoints: Breakpoint[];
  activeBreakpoint?: string;
}

/** 对齐方式 */
export type AlignType = 'start' | 'center' | 'end' | 'stretch';
export type JustifyType = 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';

/** 网格配置 (完整序列化格式) */
export interface GridConfig {
  /** 列数 */
  columns: number;
  /** 行数 (0 = 自动) */
  rows: number;
  /** 单元格高度 (px, 0 = 自动) */
  cellHeight: number;
  /** 间距 (px) */
  gap: number;
  /** 外边距 */
  margin: number | [number, number];
  /** 固定行高模式 */
  staticGrid: boolean;
  /** 动画 */
  animate: boolean;
  /** Widget 列表 */
  widgets: WidgetConfig[];
  /** 响应式 */
  responsive?: ResponsiveConfig;
  /** 嵌套网格时是否接受外部拖入 */
  acceptWidgets?: boolean;
  /** 网格对齐 */
  alignItems?: AlignType;
  justifyItems?: JustifyType;
  /** 自动行高 */
  autoRows?: string;
  /** 最大行数限制 */
  maxRows?: number;
  /** CSS 类名 */
  className?: string;
  /** 自定义数据 */
  data?: Record<string, unknown>;
}

// ─── 事件系统 ────────────────────────────────────────────────

export interface GridEventMap {
  'widget:add': { widget: WidgetConfig };
  'widget:remove': { id: string };
  'widget:change': { widget: WidgetConfig; changes: Partial<WidgetConfig> };
  'widget:move': { widget: WidgetConfig; from: GridRect; to: GridRect };
  'widget:resize': { widget: WidgetConfig; from: GridRect; to: GridRect };
  'grid:change': { config: GridConfig };
  'grid:save': { config: GridConfig };
  'grid:load': { config: GridConfig };
  'breakpoint:change': { breakpoint: Breakpoint };
  'drag:start': { widget: WidgetConfig };
  'drag:stop': { widget: WidgetConfig };
  'resize:start': { widget: WidgetConfig };
  'resize:stop': { widget: WidgetConfig };
  'mode:change': { mode: 'edit' | 'preview' };
}

export type EventHandler<T> = (event: T) => void;

// ─── CSS Grid 输出 ───────────────────────────────────────────

export interface CSSGridOutput {
  /** 容器 CSS */
  containerCSS: string;
  /** 各 Widget CSS */
  widgetCSS: Map<string, string>;
  /** 完整样式表 */
  stylesheet: string;
  /** HTML 结构 */
  html: string;
}

// ─── 编辑器配置 ──────────────────────────────────────────────

export interface EditorConfig {
  /** 挂载容器 */
  container: HTMLElement | string;
  /** 初始网格配置 */
  config?: Partial<GridConfig>;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  /** 是否显示属性面板 */
  showPropertyPanel?: boolean;
  /** 是否显示网格线 */
  showGridLines?: boolean;
  /** 主题 */
  theme?: 'light' | 'dark';
  /** 语言 */
  locale?: string;
  /** 自定义 Widget 渲染器 */
  widgetRenderer?: (widget: WidgetConfig) => string | HTMLElement;
  /** 自定义工具栏按钮 */
  toolbarItems?: ToolbarItem[];
  /** 保存回调 */
  onSave?: (config: GridConfig) => void;
  /** 变更回调 */
  onChange?: (config: GridConfig) => void;
}

export interface ToolbarItem {
  id: string;
  label: string;
  icon?: string;
  action: (editor: any) => void;
}

// ─── 预览器配置 ──────────────────────────────────────────────

export interface PreviewConfig {
  /** 挂载容器 */
  container: HTMLElement | string;
  /** 网格配置 */
  config: GridConfig;
  /** 是否响应式 */
  responsive?: boolean;
  /** 自定义 Widget 渲染器 */
  widgetRenderer?: (widget: WidgetConfig) => string | HTMLElement;
  /** 当前断点 */
  breakpoint?: string;
  /** 动画 */
  animate?: boolean;
}

// ─── 工具函数类型 ────────────────────────────────────────────

export interface ConverterOptions {
  /** 列数 */
  columns: number;
  /** 行数 */
  rows?: number;
  /** 间距 */
  gap?: number;
  /** 单元格高度 */
  cellHeight?: number;
  /** 是否生成命名区域 */
  useNamedAreas?: boolean;
  /** 区域名称前缀 */
  areaPrefix?: string;
  /** 输出格式 */
  format?: 'css' | 'object';
}

export interface ExportOptions {
  /** 格式 */
  format: 'json' | 'css' | 'html' | 'vue' | 'react' | 'angular' | 'svelte' | 'tailwind';
  /** 是否包含样式 */
  includeStyles?: boolean;
  /** 是否压缩 */
  minify?: boolean;
  /** 缩进 */
  indent?: number;
}
