/**
 * 组件注册系统 - 低代码平台的组件体系核心
 *
 * 功能：
 * - 组件注册/注销
 * - 组件分类与搜索
 * - 组件实例化
 * - 生命周期管理
 * - 组件版本控制
 * - 组件依赖解析
 * - 组件懒加载
 */

import type { WidgetConfig } from '../types';
import { uid } from '../core/converter';

// ─── 组件定义 ──────────────────────────────────────────────

/** 组件属性定义 (Schema) */
export interface PropSchema {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'date' | 'json' | 'expression' | 'slot' | 'object' | 'array';
  default?: unknown;
  required?: boolean;
  description?: string;
  /** select 选项 */
  options?: Array<{ label: string; value: unknown }>;
  /** 对象类型子属性 */
  properties?: PropSchema[];
  /** 数组类型元素定义 */
  items?: PropSchema;
  /** 校验规则 */
  rules?: ValidationRule[];
  /** 分组 */
  group?: string;
  /** 是否高级属性 */
  advanced?: boolean;
  /** 条件显示 */
  visibleWhen?: string;
  /** 联动 */
 联动?: Record<string, unknown>;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: unknown;
  message: string;
  validator?: (value: unknown) => boolean;
}

/** 组件事件定义 */
export interface EventSchema {
  name: string;
  label: string;
  description?: string;
  params?: Array<{ name: string; type: string; description?: string }>;
}

/** 组件方法定义 */
export interface MethodSchema {
  name: string;
  label: string;
  description?: string;
  params?: Array<{ name: string; type: string; default?: unknown }>;
  returnType?: string;
}

/** 组件样式定义 */
export interface StyleSchema {
  /** 支持的 CSS 属性 */
  properties: string[];
  /** 预设样式类 */
  presets?: Array<{ name: string; className: string; description?: string }>;
  /** 自定义样式变量 */
  variables?: Record<string, { type: string; default: string; label: string }>;
}

/** 组件生命周期 */
export type LifecycleHook =
  | 'onInit'       // 组件初始化
  | 'onMount'      // 挂载到 DOM
  | 'onUpdate'     // 属性更新
  | 'onUnmount'    // 从 DOM 卸载
  | 'onDestroy'    // 销毁
  | 'onError'      // 错误捕获
  | 'onResize'     // 尺寸变化
  | 'onVisibility' // 可见性变化
  | 'onDataChange' // 数据变化
  | 'onAction';    // 动作触发

/** 组件定义 */
export interface ComponentDefinition {
  /** 组件唯一标识 */
  id: string;
  /** 组件名称 */
  name: string;
  /** 显示名称 */
  label: string;
  /** 组件图标 (emoji 或 URL) */
  icon: string;
  /** 分类 */
  category: string;
  /** 标签 (搜索用) */
  tags?: string[];
  /** 版本 */
  version: string;
  /** 描述 */
  description?: string;
  /** 作者 */
  author?: string;

  /** 默认尺寸 */
  defaultSize: { w: number; h: number };
  /** 最小尺寸 */
  minSize?: { w: number; h: number };
  /** 最大尺寸 */
  maxSize?: { w: number; h: number };
  /** 是否可调整大小 */
  resizable?: boolean;

  /** 属性定义 */
  props: PropSchema[];
  /** 事件定义 */
  events?: EventSchema[];
  /** 方法定义 */
  methods?: MethodSchema[];
  /** 样式定义 */
  styles?: StyleSchema;

  /** 渲染器：返回 HTML 或 DOM */
  renderer: (props: Record<string, unknown>, context: RenderContext) => string | HTMLElement;
  /** 缩略图渲染 */
  thumbnail?: () => string;

  /** 生命周期钩子 */
  lifecycle?: Partial<Record<LifecycleHook, (ctx: ComponentContext) => void | Promise<void>>>;

  /** 子组件支持 */
  childSlots?: Array<{
    name: string;
    label: string;
    accept?: string[]; // 接受的组件 id
    maxCount?: number;
    defaultContent?: WidgetConfig[];
  }>;

  /** 依赖组件 */
  dependencies?: string[];

  /** 是否是容器组件 */
  isContainer?: boolean;

  /** 数据配置 */
  dataConfig?: {
    /** 支持的数据源类型 */
    sourceTypes: Array<'static' | 'api' | 'variable' | 'expression'>;
    /** 数据 Schema */
    schema?: PropSchema;
    /** 默认数据 */
    defaultData?: unknown;
  };

  /** 是否隐藏 (内部组件) */
  hidden?: boolean;

  /** 权限 */
  permissions?: string[];

  /** 实验性标记 */
  experimental?: boolean;
}

/** 渲染上下文 */
export interface RenderContext {
  /** 当前组件实例 id */
  instanceId: string;
  /** 网格配置 */
  gridColumns: number;
  /** 主题变量 */
  theme: Record<string, string>;
  /** 国际化 */
  t: (key: string, params?: Record<string, unknown>) => string;
  /** 数据上下文 */
  data: Record<string, unknown>;
  /** 事件绑定 */
  emit: (event: string, payload?: unknown) => void;
  /** 插槽渲染 */
  renderSlot: (name: string) => string;
}

/** 组件上下文 (生命周期用) */
export interface ComponentContext {
  /** 组件实例 id */
  instanceId: string;
  /** 组件定义 */
  definition: ComponentDefinition;
  /** 当前属性 */
  props: Record<string, unknown>;
  /** DOM 元素 */
  element: HTMLElement | null;
  /** 数据上下文 */
  data: Record<string, unknown>;
  /** 设置属性 */
  setProps: (props: Partial<Record<string, unknown>>) => void;
  /** 设置数据 */
  setData: (data: Record<string, unknown>) => void;
  /** 触发事件 */
  emit: (event: string, payload?: unknown) => void;
  /** 获取状态 */
  getState: () => Record<string, unknown>;
  /** 设置状态 */
  setState: (state: Record<string, unknown>) => void;
}

// ─── 组件实例 ──────────────────────────────────────────────

export interface ComponentInstance {
  id: string;
  componentId: string;
  props: Record<string, unknown>;
  data: Record<string, unknown>;
  state: Record<string, unknown>;
  element: HTMLElement | null;
  mounted: boolean;
  destroyed: boolean;
  version: string;
  createdAt: number;
  updatedAt: number;
}

// ─── 组件注册表 ────────────────────────────────────────────

export class ComponentRegistry {
  private components = new Map<string, ComponentDefinition>();
  private instances = new Map<string, ComponentInstance>();
  private categories = new Map<string, Set<string>>();
  private versions = new Map<string, ComponentDefinition[]>();
  private loaders = new Map<string, () => Promise<ComponentDefinition>>();

  // ─── 注册/注销 ──────────────────────────────────────────

  /** 注册组件 */
  register(definition: ComponentDefinition): void {
    const { id, category, version } = definition;

    // 版本管理
    if (!this.versions.has(id)) {
      this.versions.set(id, []);
    }
    this.versions.get(id)!.push(definition);

    // 分类
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category)!.add(id);

    // 注册
    this.components.set(id, definition);
  }

  /** 批量注册 */
  registerAll(definitions: ComponentDefinition[]): void {
    definitions.forEach((d) => this.register(d));
  }

  /** 注销组件 */
  unregister(id: string): void {
    const def = this.components.get(id);
    if (def) {
      this.categories.get(def.category)?.delete(id);
      this.components.delete(id);
      this.versions.delete(id);
    }
  }

  /** 注册懒加载组件 */
  registerLazy(id: string, loader: () => Promise<ComponentDefinition>): void {
    this.loaders.set(id, loader);
  }

  // ─── 查询 ──────────────────────────────────────────────

  /** 获取组件定义 */
  get(id: string): ComponentDefinition | undefined {
    return this.components.get(id);
  }

  /** 获取所有组件 */
  getAll(): ComponentDefinition[] {
    return Array.from(this.components.values()).filter((d) => !d.hidden);
  }

  /** 按分类获取 */
  getByCategory(category: string): ComponentDefinition[] {
    const ids = this.categories.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.components.get(id))
      .filter((d): d is ComponentDefinition => !!d && !d.hidden);
  }

  /** 获取所有分类 */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /** 搜索组件 */
  search(query: string): ComponentDefinition[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    return this.getAll().filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.label.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.tags?.some((t) => t.toLowerCase().includes(q)) ||
        d.category.toLowerCase().includes(q)
    );
  }

  /** 获取组件版本历史 */
  getVersions(id: string): ComponentDefinition[] {
    return this.versions.get(id) ?? [];
  }

  /** 获取组件最新版本 */
  getLatest(id: string): ComponentDefinition | undefined {
    const versions = this.versions.get(id);
    if (!versions?.length) return undefined;
    return versions[versions.length - 1];
  }

  // ─── 实例化 ─────────────────────────────────────────────

  /** 创建组件实例 */
  createInstance(
    componentId: string,
    props?: Record<string, unknown>,
    overrideId?: string
  ): ComponentInstance {
    const definition = this.components.get(componentId);
    if (!definition) {
      // 尝试懒加载
      if (this.loaders.has(componentId)) {
        throw new Error(`Component "${componentId}" is lazy-loaded. Call loadComponent() first.`);
      }
      throw new Error(`Component "${componentId}" not found.`);
    }

    // 合并默认属性
    const mergedProps: Record<string, unknown> = {};
    for (const schema of definition.props) {
      mergedProps[schema.name] = schema.default;
    }
    if (props) Object.assign(mergedProps, props);

    const instance: ComponentInstance = {
      id: overrideId ?? uid(),
      componentId,
      props: mergedProps,
      data: {},
      state: {},
      element: null,
      mounted: false,
      destroyed: false,
      version: definition.version,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.instances.set(instance.id, instance);
    return instance;
  }

  /** 获取实例 */
  getInstance(id: string): ComponentInstance | undefined {
    return this.instances.get(id);
  }

  /** 获取所有实例 */
  getAllInstances(): ComponentInstance[] {
    return Array.from(this.instances.values());
  }

  /** 获取某组件的所有实例 */
  getInstancesByComponent(componentId: string): ComponentInstance[] {
    return Array.from(this.instances.values()).filter((i) => i.componentId === componentId);
  }

  /** 更新实例属性 */
  updateInstanceProps(id: string, props: Record<string, unknown>): void {
    const instance = this.instances.get(id);
    if (!instance || instance.destroyed) return;
    Object.assign(instance.props, props);
    instance.updatedAt = Date.now();
  }

  /** 更新实例数据 */
  updateInstanceData(id: string, data: Record<string, unknown>): void {
    const instance = this.instances.get(id);
    if (!instance || instance.destroyed) return;
    Object.assign(instance.data, data);
    instance.updatedAt = Date.now();
  }

  /** 销毁实例 */
  destroyInstance(id: string): void {
    const instance = this.instances.get(id);
    if (!instance) return;

    const definition = this.components.get(instance.componentId);
    if (definition?.lifecycle?.onDestroy) {
      definition.lifecycle.onDestroy(this.createContext(instance, definition));
    }

    instance.destroyed = true;
    instance.element = null;
    this.instances.delete(id);
  }

  // ─── 生命周期执行 ───────────────────────────────────────

  /** 执行挂载生命周期 */
  executeMount(id: string, element: HTMLElement): void {
    const instance = this.instances.get(id);
    if (!instance || instance.destroyed) return;

    const definition = this.components.get(instance.componentId);
    if (!definition) return;

    instance.element = element;
    instance.mounted = true;

    if (definition.lifecycle?.onMount) {
      definition.lifecycle.onMount(this.createContext(instance, definition));
    }
  }

  /** 执行更新生命周期 */
  executeUpdate(id: string): void {
    const instance = this.instances.get(id);
    if (!instance || instance.destroyed || !instance.mounted) return;

    const definition = this.components.get(instance.componentId);
    if (!definition) return;

    if (definition.lifecycle?.onUpdate) {
      definition.lifecycle.onUpdate(this.createContext(instance, definition));
    }
  }

  /** 执行卸载生命周期 */
  executeUnmount(id: string): void {
    const instance = this.instances.get(id);
    if (!instance) return;

    const definition = this.components.get(instance.componentId);
    if (definition?.lifecycle?.onUnmount) {
      definition.lifecycle.onUnmount(this.createContext(instance, definition));
    }

    instance.mounted = false;
    instance.element = null;
  }

  // ─── 懒加载 ─────────────────────────────────────────────

  /** 加载懒加载组件 */
  async loadComponent(id: string): Promise<ComponentDefinition | undefined> {
    const loader = this.loaders.get(id);
    if (!loader) return this.components.get(id);

    const definition = await loader();
    this.register(definition);
    this.loaders.delete(id);
    return definition;
  }

  /** 批量加载 */
  async loadComponents(ids: string[]): Promise<ComponentDefinition[]> {
    return Promise.all(ids.map((id) => this.loadComponent(id).then((d) => d!)));
  }

  // ─── 依赖解析 ───────────────────────────────────────────

  /** 解析组件依赖 */
  resolveDependencies(id: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (compId: string) => {
      if (visited.has(compId)) return;
      visited.add(compId);

      const def = this.components.get(compId);
      if (!def) return;

      if (def.dependencies) {
        for (const dep of def.dependencies) {
          visit(dep);
          result.push(dep);
        }
      }
    };

    visit(id);
    return [...new Set(result)];
  }

  /** 检查依赖是否满足 */
  checkDependencies(id: string): { satisfied: boolean; missing: string[] } {
    const deps = this.resolveDependencies(id);
    const missing = deps.filter((d) => !this.components.has(d) && !this.loaders.has(d));
    return { satisfied: missing.length === 0, missing };
  }

  // ─── 序列化 ─────────────────────────────────────────────

  /** 导出组件注册表 */
  export(): string {
    return JSON.stringify(
      {
        components: Array.from(this.components.entries()),
        timestamp: Date.now(),
      },
      null,
      2
    );
  }

  /** 导入组件注册表 */
  import(json: string): void {
    const { components } = JSON.parse(json);
    for (const [, def] of components) {
      this.register(def as ComponentDefinition);
    }
  }

  // ─── 工具 ────────────────────────────────────────────────

  private createContext(instance: ComponentInstance, definition: ComponentDefinition): ComponentContext {
    return {
      instanceId: instance.id,
      definition,
      props: instance.props,
      element: instance.element,
      data: instance.data,
      setProps: (props) => this.updateInstanceProps(instance.id, props),
      setData: (data) => this.updateInstanceData(instance.id, data),
      emit: (event, payload) => {
        // 事件由外部事件系统处理
      },
      getState: () => instance.state,
      setState: (state) => Object.assign(instance.state, state),
    };
  }

  /** 清空 */
  clear(): void {
    // 销毁所有实例
    for (const [id] of this.instances) {
      this.destroyInstance(id);
    }
    this.components.clear();
    this.categories.clear();
    this.versions.clear();
    this.loaders.clear();
  }
}
