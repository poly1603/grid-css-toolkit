/**
 * Grid CSS Toolkit
 *
 * GridStack.js ↔ CSS Grid 转换工具包
 * - 编辑态：基于 GridStack.js 的可视化拖拽排版
 * - 预览态：纯 CSS Grid 渲染，零依赖
 *
 * @example
 * ```ts
 * import { Editor, Preview, toCSSGrid, templates } from 'grid-css-toolkit';
 * import 'grid-css-toolkit/style.css';
 *
 * // 编辑器
 * const editor = new Editor({
 *   container: '#editor',
 *   config: templates.dashboard(),
 * });
 *
 * // 预览
 * const preview = new Preview({
 *   container: '#preview',
 *   config: editor.getConfig(),
 * });
 * ```
 */

// ─── 核心引擎 ──────────────────────────────────────────────

export {
  toCSSGrid,
  fromCSSGrid,
  generateContainerCSS,
  generateWidgetCSS,
  generateNamedAreas,
  generateStandaloneHTML,
  detectOverlaps,
  resolveOverlaps,
  rectToPlacement,
  placementToRect,
  uid,
  deepClone,
  safeSelector,
  mergeDefaults,
} from './core/converter';

// ─── 序列化 ────────────────────────────────────────────────

export {
  toJSON,
  fromJSON,
  toCSS,
  toHTML,
  toVue,
  toReact,
  toTailwind,
  toAngular,
  toSvelte,
  exportLayout,
  loadFromStorage,
  saveToStorage,
  templates,
} from './core/serializer';

// ─── 事件系统 ──────────────────────────────────────────────

export { EventBus } from './core/events';

// ─── 编辑器 ────────────────────────────────────────────────

export { Editor } from './editor/index';
export { Toolbar } from './editor/toolbar';
export { PropertyPanel } from './editor/property-panel';
export { HistoryManager } from './editor/history';
export { WidgetLibrary } from './editor/widget-library';
export { ContextMenu, createWidgetContextMenu, createGridContextMenu } from './editor/context-menu';
export { AlignGuides } from './editor/align-guides';
export { ZoomController, DeviceFrame, DEVICE_PRESETS } from './editor/zoom';
export { SelectionManager } from './editor/selection';
export { SnapshotManager } from './editor/snapshots';

// ─── 预览器 ────────────────────────────────────────────────

export { Preview } from './preview/index';

// ─── 类型 ──────────────────────────────────────────────────

export type {
  GridConfig,
  WidgetConfig,
  GridRect,
  CSSGridPlacement,
  CSSGridOutput,
  ConverterOptions,
  ExportOptions,
  EditorConfig,
  PreviewConfig,
  Breakpoint,
  ResponsiveConfig,
  WidgetContentType,
  AlignType,
  JustifyType,
  GridEventMap,
  EventHandler,
  ToolbarItem,
} from './types';

export type { WidgetTemplate } from './editor/widget-library';
export type { ContextMenuItem } from './editor/context-menu';
export type { GuideLine } from './editor/align-guides';
export type { ZoomState, DevicePreset } from './editor/zoom';
export type { Snapshot, SnapshotDiff } from './editor/snapshots';

// ─── 低代码模块 ──────────────────────────────────────────────

export * from './lowcode/index';
