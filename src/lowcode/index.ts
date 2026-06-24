/**
 * Low-Code Module - 低代码平台核心能力
 *
 * 提供完整的低代码平台基础设施：
 * - 组件注册系统
 * - 数据绑定引擎
 * - 事件动作系统
 * - 主题系统
 * - 数据源管理
 * - 国际化
 * - Schema 驱动渲染
 * - 脚本/逻辑编辑器
 */

// ─── 组件系统 ──────────────────────────────────────────────

export {
  ComponentRegistry,
} from './component-registry';

export type {
  ComponentDefinition,
  ComponentInstance,
  PropSchema,
  EventSchema,
  MethodSchema,
  StyleSchema,
  LifecycleHook,
  RenderContext,
  ComponentContext,
  ValidationRule,
} from './component-registry';

// ─── 数据绑定 ──────────────────────────────────────────────

export {
  DataContext,
  DataPipeline,
  parseBinding,
  resolveBinding,
  resolveTemplate,
  evaluateExpression,
  executePipe,
  registerPipe,
  extractBindings,
  applyBindings,
} from './data-binding';

export type {
  BindingType,
  DataBinding,
  PipeOperation,
} from './data-binding';

// ─── 事件动作 ──────────────────────────────────────────────

export {
  ActionExecutor,
  EventManager,
  ACTION_SCHEMAS,
} from './event-action';

export type {
  EventDefinition,
  ActionType,
  ActionDefinition,
  ActionConfigSchema,
  ActionExecutorContext,
} from './event-action';

// ─── 主题系统 ──────────────────────────────────────────────

export {
  ThemeManager,
} from './theme';

export type {
  ThemeVariable,
  ThemePreset,
  ThemeConfig,
} from './theme';

// ─── 数据源 ────────────────────────────────────────────────

export {
  DataSourceManager,
} from './datasource';

export type {
  DataSourceType,
  DataSourceConfig,
  DataSourceInstance,
  RequestConfig,
  MockConfig,
  GraphQLConfig,
  WebSocketConfig,
  TransformConfig,
} from './datasource';

// ─── 国际化 ────────────────────────────────────────────────

export {
  I18nManager,
} from './i18n';

export type {
  LocaleConfig,
  LocaleMessages,
} from './i18n';

// ─── Schema ────────────────────────────────────────────────

export {
  gridToPageSchema,
  widgetsToComponentNodes,
  componentNodesToWidgets,
  validatePageSchema,
  diffSchemas,
  findNode,
  updateNodeProps,
  removeNode,
  addNode,
  moveNode,
  cloneNode,
  serializeSchema,
  deserializeSchema,
  schemaSummary,
} from './schema-renderer';

export type {
  PageSchema,
  ComponentNode,
  SchemaValidationError,
  SchemaDiff,
} from './schema-renderer';

// ─── 脚本 ──────────────────────────────────────────────────

export {
  ScriptManager,
} from './script-editor';

export type {
  ScriptDefinition,
  ScriptTrigger,
  ScriptTemplate,
} from './script-editor';

// ─── 物料系统 ──────────────────────────────────────────────

export {
  MaterialManager,
} from './material';

export type {
  MaterialType,
  MaterialDefinition,
  MaterialInstance,
} from './material';

// ─── 动画系统 ──────────────────────────────────────────────

export {
  AnimationManager,
} from './animation';

export type {
  AnimationTrigger,
  AnimationDirection,
  AnimationFillMode,
  AnimationTimingFunction,
  Keyframe,
  AnimationConfig,
  InteractionAnimation,
  ScrollAnimation,
  AnimationPreset,
} from './animation';

// ─── 属性面板渲染器 ────────────────────────────────────────

export {
  PropPanelRenderer,
} from './prop-panel-renderer';

export type {
  PanelTab,
  PanelTabConfig,
} from './prop-panel-renderer';
