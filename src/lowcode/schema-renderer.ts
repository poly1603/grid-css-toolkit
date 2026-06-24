/**
 * Schema 驱动渲染引擎 - JSON Schema → UI
 *
 * 功能：
 * - JSON Schema 表单生成
 * - 条件渲染
 * - 循环渲染
 * - 动态属性面板
 * - 组件树序列化/反序列化
 * - 页面 Schema 规范
 */

import type { GridConfig, WidgetConfig } from '../types';
import type { ComponentDefinition, PropSchema } from './component-registry';
import type { DataBinding } from './data-binding';
import { uid } from '../core/converter';

// ─── 页面 Schema ───────────────────────────────────────────

export interface PageSchema {
  /** Schema 版本 */
  version: string;
  /** 页面 ID */
  id: string;
  /** 页面名称 */
  name: string;
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description?: string;
  /** 页面图标 */
  icon?: string;
  /** 路由路径 */
  path?: string;
  /** 页面级数据 */
  data?: Record<string, unknown>;
  /** 页面级变量 */
  state?: Record<string, unknown>;
  /** 页面级数据源 */
  dataSources?: Array<Record<string, unknown>>;
  /** 页面级事件 */
  events?: Array<Record<string, unknown>>;
  /** 页面级主题覆盖 */
  theme?: Record<string, string>;
  /** 布局配置 */
  layout: GridConfig;
  /** 组件树 */
  components: ComponentNode[];
  /** 全局脚本 */
  scripts?: Array<{ name: string; code: string; trigger: string }>;
  /** 页面生命周期 */
  lifecycle?: {
    onLoad?: string;
    onShow?: string;
    onHide?: string;
    onUnload?: string;
  };
  /** SEO */
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
  /** 权限 */
  permissions?: string[];
  /** 创建时间 */
  createdAt?: number;
  /** 更新时间 */
  updatedAt?: number;
  /** 作者 */
  author?: string;
  /** 版本历史 */
  versionHistory?: Array<{ version: string; timestamp: number; author?: string }>;
}

/** 组件树节点 */
export interface ComponentNode {
  /** 节点 ID */
  id: string;
  /** 组件定义 ID */
  componentId: string;
  /** 组件版本 */
  version?: string;
  /** 组件名称 (实例名称) */
  name?: string;
  /** 属性值 */
  props: Record<string, unknown>;
  /** 样式覆盖 */
  style?: Record<string, string>;
  /** 类名 */
  className?: string;
  /** 子节点 */
  children?: ComponentNode[];
  /** 条件渲染表达式 */
  condition?: string;
  /** 循环渲染配置 */
  loop?: {
    dataSource: string;
    itemName?: string;
    indexName?: string;
    key?: string;
  };
  /** 事件绑定 */
  events?: Record<string, Array<Record<string, unknown>>>;
  /** 数据绑定 */
  bindings?: Record<string, DataBinding>;
  /** 权限 */
  permissions?: string[];
  /** 注释 (开发用) */
  comment?: string;
  /** 是否锁定 */
  locked?: boolean;
  /** 是否隐藏 */
  hidden?: boolean;
}

// ─── Schema 操作工具 ───────────────────────────────────────

/** 从 GridConfig 生成 PageSchema */
export function gridToPageSchema(
  config: GridConfig,
  meta?: Partial<Omit<PageSchema, 'layout'>>
): PageSchema {
  return {
    version: '1.0.0',
    id: meta?.id ?? uid(),
    name: meta?.name ?? 'Untitled',
    title: meta?.title ?? 'Untitled Page',
    description: meta?.description,
    icon: meta?.icon,
    path: meta?.path,
    data: meta?.data ?? {},
    state: meta?.state ?? {},
    dataSources: meta?.dataSources ?? [],
    events: meta?.events ?? [],
    theme: meta?.theme,
    layout: config,
    components: widgetsToComponentNodes(config.widgets),
    scripts: meta?.scripts,
    lifecycle: meta?.lifecycle,
    seo: meta?.seo,
    permissions: meta?.permissions,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    author: meta?.author,
  };
}

/** WidgetConfig[] → ComponentNode[] */
export function widgetsToComponentNodes(widgets: WidgetConfig[]): ComponentNode[] {
  return widgets.map((w) => ({
    id: w.id,
    componentId: w.contentType === 'component' ? (w.content ?? 'unknown') : 'builtin/widget',
    props: {
      content: w.content,
      contentType: w.contentType,
      ...w.data,
    },
    style: w.style as Record<string, string>,
    className: w.className,
    locked: w.locked,
    hidden: w.visible === false,
    children: w.subGrid ? widgetsToComponentNodes(w.subGrid.widgets) : undefined,
  }));
}

/** ComponentNode[] → WidgetConfig[] */
export function componentNodesToWidgets(nodes: ComponentNode[]): WidgetConfig[] {
  return nodes.map((n) => ({
    id: n.id,
    rect: { x: 0, y: 0, w: 4, h: 3 }, // 默认值，需要从 layout 获取
    content: n.props.content as string ?? '',
    contentType: n.props.contentType as any ?? 'text',
    className: n.className,
    style: n.style as any,
    data: n.props,
    locked: n.locked,
    visible: n.hidden === false,
    subGrid: n.children
      ? { columns: 12, rows: 0, cellHeight: 80, gap: 10, margin: 10, staticGrid: false, animate: true, widgets: componentNodesToWidgets(n.children) }
      : undefined,
  }));
}

// ─── Schema 校验 ───────────────────────────────────────────

export interface SchemaValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

/** 校验 PageSchema */
export function validatePageSchema(schema: PageSchema): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (!schema.id) errors.push({ path: 'id', message: '页面 ID 不能为空', severity: 'error' });
  if (!schema.name) errors.push({ path: 'name', message: '页面名称不能为空', severity: 'error' });
  if (!schema.layout) errors.push({ path: 'layout', message: '布局配置不能为空', severity: 'error' });
  if (!schema.version) errors.push({ path: 'version', message: '版本号不能为空', severity: 'warning' });

  // 校验组件树
  function validateNode(node: ComponentNode, path: string): void {
    if (!node.id) errors.push({ path: `${path}.id`, message: '组件 ID 不能为空', severity: 'error' });
    if (!node.componentId) errors.push({ path: `${path}.componentId`, message: '组件类型不能为空', severity: 'error' });
    if (node.children) {
      node.children.forEach((child, i) => validateNode(child, `${path}.children[${i}]`));
    }
  }

  schema.components?.forEach((node, i) => validateNode(node, `components[${i}]`));

  return errors;
}

// ─── Schema Diff ───────────────────────────────────────────

export interface SchemaDiff {
  added: ComponentNode[];
  removed: ComponentNode[];
  modified: Array<{
    id: string;
    changes: Record<string, { from: unknown; to: unknown }>;
  }>;
  moved: Array<{
    id: string;
    fromIndex: number;
    toIndex: number;
  }>;
}

export function diffSchemas(oldSchema: PageSchema, newSchema: PageSchema): SchemaDiff {
  const oldNodes = new Map(oldSchema.components.map((n) => [n.id, n]));
  const newNodes = new Map(newSchema.components.map((n) => [n.id, n]));

  const added: ComponentNode[] = [];
  const removed: ComponentNode[] = [];
  const modified: SchemaDiff['modified'] = [];

  for (const [id, node] of newNodes) {
    if (!oldNodes.has(id)) {
      added.push(node);
    } else {
      const oldNode = oldNodes.get(id)!;
      const changes: Record<string, { from: unknown; to: unknown }> = {};

      // 比较 props
      for (const key of new Set([...Object.keys(oldNode.props), ...Object.keys(node.props)])) {
        if (JSON.stringify(oldNode.props[key]) !== JSON.stringify(node.props[key])) {
          changes[`props.${key}`] = { from: oldNode.props[key], to: node.props[key] };
        }
      }

      // 比较其他字段
      for (const key of ['className', 'condition', 'hidden', 'locked'] as const) {
        if (oldNode[key] !== node[key]) {
          changes[key] = { from: oldNode[key], to: node[key] };
        }
      }

      if (Object.keys(changes).length > 0) {
        modified.push({ id, changes });
      }
    }
  }

  for (const [id] of oldNodes) {
    if (!newNodes.has(id)) {
      removed.push(oldNodes.get(id)!);
    }
  }

  return { added, removed, modified, moved: [] };
}

// ─── Schema 操作 ───────────────────────────────────────────

/** 查找组件节点 */
export function findNode(schema: PageSchema, id: string): ComponentNode | undefined {
  function search(nodes: ComponentNode[]): ComponentNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = search(node.children);
        if (found) return found;
      }
    }
    return undefined;
  }
  return search(schema.components);
}

/** 更新组件节点属性 */
export function updateNodeProps(schema: PageSchema, id: string, props: Record<string, unknown>): PageSchema {
  const node = findNode(schema, id);
  if (node) {
    node.props = { ...node.props, ...props };
    schema.updatedAt = Date.now();
  }
  return schema;
}

/** 删除组件节点 */
export function removeNode(schema: PageSchema, id: string): PageSchema {
  function removeFromList(nodes: ComponentNode[]): ComponentNode[] {
    return nodes.filter((n) => n.id !== id).map((n) => ({
      ...n,
      children: n.children ? removeFromList(n.children) : undefined,
    }));
  }
  schema.components = removeFromList(schema.components);
  schema.updatedAt = Date.now();
  return schema;
}

/** 添加组件节点 */
export function addNode(
  schema: PageSchema,
  node: ComponentNode,
  parentId?: string,
  index?: number
): PageSchema {
  if (parentId) {
    const parent = findNode(schema, parentId);
    if (parent) {
      if (!parent.children) parent.children = [];
      if (index !== undefined) {
        parent.children.splice(index, 0, node);
      } else {
        parent.children.push(node);
      }
    }
  } else {
    if (index !== undefined) {
      schema.components.splice(index, 0, node);
    } else {
      schema.components.push(node);
    }
  }
  schema.updatedAt = Date.now();
  return schema;
}

/** 移动组件节点 */
export function moveNode(
  schema: PageSchema,
  id: string,
  targetParentId?: string,
  targetIndex?: number
): PageSchema {
  // 先找到并移除
  let node: ComponentNode | undefined;
  function removeFromList(nodes: ComponentNode[]): ComponentNode[] {
    return nodes.filter((n) => {
      if (n.id === id) {
        node = n;
        return false;
      }
      return true;
    }).map((n) => ({
      ...n,
      children: n.children ? removeFromList(n.children) : undefined,
    }));
  }
  schema.components = removeFromList(schema.components);

  // 添加到目标位置
  if (node) {
    addNode(schema, node, targetParentId, targetIndex);
  }

  return schema;
}

/** 克隆组件节点 (深拷贝，重新生成 ID) */
export function cloneNode(node: ComponentNode, generateNewId = true): ComponentNode {
  return {
    ...node,
    id: generateNewId ? uid() : node.id,
    props: JSON.parse(JSON.stringify(node.props)),
    style: node.style ? { ...node.style } : undefined,
    children: node.children?.map((child) => cloneNode(child, generateNewId)),
    events: node.events ? JSON.parse(JSON.stringify(node.events)) : undefined,
    bindings: node.bindings ? JSON.parse(JSON.stringify(node.bindings)) : undefined,
  };
}

/** 序列化为 JSON */
export function serializeSchema(schema: PageSchema): string {
  return JSON.stringify(schema, null, 2);
}

/** 从 JSON 反序列化 */
export function deserializeSchema(json: string): PageSchema {
  return JSON.parse(json);
}

/** 生成组件树摘要 */
export function schemaSummary(schema: PageSchema): string {
  const lines: string[] = [];
  lines.push(`📄 ${schema.name} (${schema.id})`);
  lines.push(`   Version: ${schema.version}`);
  lines.push(`   Path: ${schema.path ?? '/'}`);
  lines.push(`   Components: ${countNodes(schema.components)}`);
  lines.push(`   Layout: ${schema.layout.columns} cols, ${schema.layout.widgets.length} widgets`);

  function countNodes(nodes: ComponentNode[]): number {
    return nodes.reduce((sum, n) => sum + 1 + (n.children ? countNodes(n.children) : 0), 0);
  }

  return lines.join('\n');
}
