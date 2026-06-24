/**
 * GCT Editor - GridStack.js 可视化编辑器
 *
 * 核心功能：
 * - 基于 GridStack.js 的拖拽/缩放编辑
 * - 工具栏 + 属性面板 + Widget 库
 * - 撤销/重做
 * - 右键上下文菜单
 * - 多选 + 框选 + 批量操作
 * - 对齐辅助线 + 智能吸附
 * - 缩放控制 + 设备预览框
 * - 布局快照/版本管理
 * - 实时预览切换
 * - 序列化/反序列化
 * - 键盘快捷键
 * - 自动保存
 */

import { GridStack, type GridStackWidget, type GridStackOptions } from 'gridstack';
import type {
  GridConfig,
  WidgetConfig,
  EditorConfig,
  GridRect,
  GridEventMap,
} from '../types';
import { EventBus } from '../core/events';
import { uid, deepClone, mergeDefaults, resolveOverlaps } from '../core/converter';
import { toJSON, fromJSON, saveToStorage, loadFromStorage, exportLayout } from '../core/serializer';
import { createIcon } from '../utils/icons';
import { Toolbar } from './toolbar';
import { PropertyPanel } from './property-panel';
import { HistoryManager } from './history';
import { WidgetLibrary } from './widget-library';
import { ContextMenu, createWidgetContextMenu, createGridContextMenu } from './context-menu';
import { AlignGuides } from './align-guides';
import { ZoomController, DeviceFrame } from './zoom';
import { SelectionManager } from './selection';
import { SnapshotManager } from './snapshots';

// ─── Widget 内部映射 ────────────────────────────────────────

interface InternalWidget {
  config: WidgetConfig;
  element: HTMLElement;
}

// ─── 编辑器主类 ─────────────────────────────────────────────

export class Editor {
  private container: HTMLElement;
  private gridEl!: HTMLElement;
  private grid!: GridStack;
  private config: GridConfig;
  private editorConfig: EditorConfig;
  private events = new EventBus();
  private widgets = new Map<string, InternalWidget>();
  private toolbar!: Toolbar;
  private propertyPanel!: PropertyPanel;
  private history: HistoryManager;
  private selectedId: string | null = null;
  private isPreview = false;
  private gridLinesVisible = false;
  private autoSaveTimer: number | null = null;
  private _destroyed = false;

  // 新增模块
  private widgetLibrary!: WidgetLibrary;
  private contextMenu!: ContextMenu;
  private alignGuides!: AlignGuides;
  private zoomController!: ZoomController;
  private deviceFrame!: DeviceFrame;
  private selectionManager!: SelectionManager;
  private snapshotManager!: SnapshotManager;

  constructor(editorConfig: EditorConfig) {
    this.editorConfig = editorConfig;

    // 解析容器
    const container =
      typeof editorConfig.container === 'string'
        ? document.querySelector<HTMLElement>(editorConfig.container)
        : editorConfig.container;
    if (!container) throw new Error(`[GCT Editor] Container not found: ${editorConfig.container}`);
    this.container = container;

    // 合并配置
    this.config = mergeDefaults(editorConfig.config ?? {});

    // 初始化历史
    this.history = new HistoryManager(50);

    // 构建 DOM
    this.buildDOM();

    // 初始化组件
    this.initToolbar();
    this.initPropertyPanel();
    this.initGridStack();
    this.initWidgetLibrary();
    this.initContextMenu();
    this.initAlignGuides();
    this.initZoom();
    this.initDeviceFrame();
    this.initSelection();
    this.initSnapshots();
    this.initKeyboard();
    this.initAutoSave();

    // 加载已有布局
    if (editorConfig.config?.widgets?.length) {
      this.loadConfig(this.config);
    }

    this.emit('grid:change', { config: this.config });
  }

  // ─── DOM 构建 ────────────────────────────────────────────

  private buildDOM(): void {
    this.container.classList.add('gct-editor');
    if (this.editorConfig.theme === 'dark') this.container.classList.add('gct-editor--dark');

    this.container.innerHTML = `
      <div class="gct-editor__toolbar-slot"></div>
      <div class="gct-editor__body">
        <div class="gct-editor__lib-slot"></div>
        <div class="gct-editor__canvas">
          <div class="gct-grid-container">
            <div class="gct-grid-stack"></div>
            <div class="gct-grid-lines" style="display:none;"></div>
          </div>
        </div>
        <div class="gct-editor__panel-slot"></div>
      </div>
    `;

    this.gridEl = this.container.querySelector('.gct-grid-stack')!;
  }

  // ─── GridStack 初始化 ────────────────────────────────────

  private initGridStack(): void {
    const options: GridStackOptions = {
      column: this.config.columns,
      cellHeight: this.config.cellHeight || 80,
      margin: typeof this.config.margin === 'number' ? this.config.margin : 10,
      animate: this.config.animate,
      staticGrid: this.config.staticGrid,
      acceptWidgets: this.config.acceptWidgets !== false,
      maxRow: this.config.maxRows || 0,
      float: true,
      removable: true,
      removeTimeout: 100,
      disableOneColumnMode: true,
      dragHandle: '.gct-widget__drag-handle',
      itemClass: 'gct-widget',
    };

    this.grid = GridStack.init(options, this.gridEl);

    // 事件绑定
    this.grid.on('change', (_e: Event, items: GridStackWidget | GridStackWidget[]) => this.handleChange(Array.isArray(items) ? items : [items]));
    this.grid.on('added', (_e: Event, items: GridStackWidget | GridStackWidget[]) => this.handleAdded(Array.isArray(items) ? items : [items]));
    this.grid.on('removed', (_e: Event, items: GridStackWidget | GridStackWidget[]) => this.handleRemoved(Array.isArray(items) ? items : [items]));
    this.grid.on('dragstart', (_e: Event, el: GridStackWidget) => this.handleDragStart(el));
    this.grid.on('dragstop', (_e: Event, el: GridStackWidget) => this.handleDragStop(el));
    this.grid.on('resizestart', (_e: Event, el: GridStackWidget) => this.handleResizeStart(el));
    this.grid.on('resizestop', (_e: Event, el: GridStackWidget) => this.handleResizeStop(el));

    // 点击空白取消选中
    this.gridEl.addEventListener('click', (e) => {
      if (e.target === this.gridEl || (e.target as HTMLElement).classList.contains('grid-stack')) {
        this.deselect();
      }
    });

    // 拖放支持 (从 Widget 库拖入)
    this.gridEl.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types.includes('application/gct-widget')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    this.gridEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const config = this.widgetLibrary?.handleDrop(e.dataTransfer!);
      if (config) {
        this.addWidgetFromConfig(config);
      }
    });
  }

  // ─── 事件处理 ────────────────────────────────────────────

  private handleAdded(items: GridStackWidget[]): void {
    for (const gsWidget of items) {
      const id = (gsWidget.id as string) || uid();
      gsWidget.id = id;

      const el = gsWidget.el as HTMLElement;
      el.dataset.gctId = id;

      this.buildWidgetContent(el, id);

      const rect: GridRect = {
        x: gsWidget.x ?? 0,
        y: gsWidget.y ?? 0,
        w: gsWidget.w ?? 1,
        h: gsWidget.h ?? 1,
      };

      const config: WidgetConfig = {
        id,
        rect,
        content: '',
        contentType: 'text',
        visible: true,
      };

      this.widgets.set(id, { config, element: el });
      this.config.widgets.push(config);

      this.emit('widget:add', { widget: config });
    }
    this.pushHistory();
  }

  private handleChange(items: GridStackWidget[]): void {
    for (const gsWidget of items) {
      const id = gsWidget.id as string;
      const internal = this.widgets.get(id);
      if (!internal) continue;

      const oldRect = { ...internal.config.rect };
      const newRect: GridRect = {
        x: gsWidget.x ?? oldRect.x,
        y: gsWidget.y ?? oldRect.y,
        w: gsWidget.w ?? oldRect.w,
        h: gsWidget.h ?? oldRect.h,
      };

      internal.config.rect = newRect;

      const idx = this.config.widgets.findIndex((w) => w.id === id);
      if (idx >= 0) this.config.widgets[idx].rect = newRect;

      if (oldRect.x !== newRect.x || oldRect.y !== newRect.y) {
        this.emit('widget:move', { widget: internal.config, from: oldRect, to: newRect });
      }
      if (oldRect.w !== newRect.w || oldRect.h !== newRect.h) {
        this.emit('widget:resize', { widget: internal.config, from: oldRect, to: newRect });
      }
      this.emit('widget:change', { widget: internal.config, changes: { rect: newRect } });
    }
    this.pushHistory();
    this.emit('grid:change', { config: this.config });
  }

  private handleRemoved(items: GridStackWidget[]): void {
    for (const gsWidget of items) {
      const id = gsWidget.id as string;
      this.widgets.delete(id);
      this.config.widgets = this.config.widgets.filter((w) => w.id !== id);
      if (this.selectedId === id) this.deselect();
      this.emit('widget:remove', { id });
    }
    this.pushHistory();
  }

  private handleDragStart(el: GridStackWidget): void {
    const id = (el as any).id || (el.el as HTMLElement)?.dataset.gctId;
    if (id) {
      const w = this.widgets.get(id);
      if (w) this.emit('drag:start', { widget: w.config });
    }
  }

  private handleDragStop(el: GridStackWidget): void {
    const id = (el as any).id || (el.el as HTMLElement)?.dataset.gctId;
    if (id) {
      const w = this.widgets.get(id);
      if (w) this.emit('drag:stop', { widget: w.config });
    }
    this.alignGuides?.clear();
  }

  private handleResizeStart(el: GridStackWidget): void {
    const id = (el as any).id || (el.el as HTMLElement)?.dataset.gctId;
    if (id) {
      const w = this.widgets.get(id);
      if (w) this.emit('resize:start', { widget: w.config });
    }
  }

  private handleResizeStop(el: GridStackWidget): void {
    const id = (el as any).id || (el.el as HTMLElement)?.dataset.gctId;
    if (id) {
      const w = this.widgets.get(id);
      if (w) this.emit('resize:stop', { widget: w.config });
    }
  }

  // ─── Widget 内容渲染 ─────────────────────────────────────

  private buildWidgetContent(el: HTMLElement, id: string): void {
    const internal = this.widgets.get(id);
    const config = internal?.config;

    el.innerHTML = `
      <div class="gct-widget__drag-handle"></div>
      <div class="gct-widget__content">${config?.content ?? ''}</div>
      <div class="gct-widget__resize-handle"></div>
      <div class="gct-widget__actions">
        <button class="gct-widget__btn" data-act="edit" title="编辑">${createIcon('edit', 12)}</button>
        <button class="gct-widget__btn" data-act="delete" title="删除">${createIcon('trash-2', 12)}</button>
      </div>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.select(id);

      const target = e.target as HTMLElement;
      const act = target.dataset.act || (target.closest('[data-act]') as HTMLElement)?.dataset?.act;
      if (act === 'delete') {
        this.removeWidget(id);
      } else if (act === 'edit') {
        this.startInlineEdit(id);
      }
    });

    // 右键菜单
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.select(id);
      this.showWidgetContextMenu(e.clientX, e.clientY, id);
    });
  }

  private refreshWidgetContent(id: string): void {
    const internal = this.widgets.get(id);
    if (!internal) return;
    const contentEl = internal.element.querySelector('.gct-widget__content');
    if (contentEl) {
      if (internal.config.contentType === 'html') {
        contentEl.innerHTML = internal.config.content ?? '';
      } else {
        contentEl.textContent = internal.config.content ?? '';
      }
    }
    if (internal.config.className) {
      internal.element.className = `grid-stack-item gct-widget ${internal.config.className}`;
    }
  }

  // ─── 内联编辑 ────────────────────────────────────────────

  private startInlineEdit(id: string): void {
    const internal = this.widgets.get(id);
    if (!internal) return;
    const contentEl = internal.element.querySelector('.gct-widget__content') as HTMLElement;
    if (!contentEl) return;

    contentEl.contentEditable = 'true';
    contentEl.focus();
    const range = document.createRange();
    range.selectNodeContents(contentEl);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    const finish = () => {
      contentEl.contentEditable = 'false';
      const newContent = contentEl.textContent ?? '';
      this.updateWidget(id, { content: newContent });
      contentEl.removeEventListener('blur', finish);
      contentEl.removeEventListener('keydown', onKey);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finish();
      }
      if (e.key === 'Escape') {
        contentEl.contentEditable = 'false';
        this.refreshWidgetContent(id);
        contentEl.removeEventListener('blur', finish);
        contentEl.removeEventListener('keydown', onKey);
      }
    };

    contentEl.addEventListener('blur', finish);
    contentEl.addEventListener('keydown', onKey);
  }

  // ─── 选择 ────────────────────────────────────────────────

  select(id: string, multi = false): void {
    if (!multi) {
      if (this.selectedId) {
        const old = this.widgets.get(this.selectedId);
        old?.element.classList.remove('gct-widget--selected');
      }
    }

    this.selectedId = id;
    const internal = this.widgets.get(id);
    if (internal) {
      internal.element.classList.add('gct-widget--selected');
      this.propertyPanel.select(internal.config, this.config.columns);
    }

    this.selectionManager?.select(id, multi);
  }

  deselect(): void {
    if (this.selectedId) {
      const old = this.widgets.get(this.selectedId);
      old?.element.classList.remove('gct-widget--selected');
    }
    this.selectedId = null;
    this.propertyPanel.select(null, this.config.columns);
    this.selectionManager?.deselect();
  }

  // ─── Widget 操作 ─────────────────────────────────────────

  addWidget(w = 2, h = 2, content = ''): string {
    const id = uid();
    const gsWidget: GridStackWidget = {
      id,
      w,
      h,
      content: '',
      autoPosition: true,
    };

    this.grid.addWidget(gsWidget);
    requestAnimationFrame(() => {
      const internal = this.widgets.get(id);
      if (internal) {
        internal.config.content = content;
        this.refreshWidgetContent(id);
      }
    });

    return id;
  }

  removeWidget(id: string): void {
    const internal = this.widgets.get(id);
    if (!internal) return;
    this.grid.removeWidget(internal.element);
  }

  updateWidget(id: string, changes: Partial<WidgetConfig>): void {
    const internal = this.widgets.get(id);
    if (!internal) return;

    Object.assign(internal.config, changes);

    if (changes.rect) {
      this.grid.update(internal.element, {
        x: changes.rect.x,
        y: changes.rect.y,
        w: changes.rect.w,
        h: changes.rect.h,
      });
    }

    if (changes.locked !== undefined) {
      this.grid.update(internal.element, {
        locked: changes.locked,
        noMove: changes.locked,
        noResize: changes.locked,
      });
    }

    if (changes.visible !== undefined) {
      internal.element.style.display = changes.visible === false ? 'none' : '';
    }

    if (changes.content !== undefined || changes.className !== undefined) {
      this.refreshWidgetContent(id);
    }

    const idx = this.config.widgets.findIndex((w) => w.id === id);
    if (idx >= 0) {
      this.config.widgets[idx] = internal.config;
    }

    if (this.selectedId === id) {
      this.propertyPanel.select(internal.config, this.config.columns);
    }

    this.emit('widget:change', { widget: internal.config, changes });
    this.pushHistory();
  }

  duplicateWidget(id: string): void {
    const internal = this.widgets.get(id);
    if (!internal) return;
    const newConfig = deepClone(internal.config);
    newConfig.id = uid();
    newConfig.rect.y += internal.config.rect.h;
    this.addWidgetFromConfig(newConfig);
  }

  addWidgetFromConfig(config: WidgetConfig): string {
    const id = config.id || uid();
    config.id = id;

    const gsWidget: GridStackWidget = {
      id,
      x: config.rect.x,
      y: config.rect.y,
      w: config.rect.w,
      h: config.rect.h,
      minW: config.minW,
      minH: config.minH,
      maxW: config.maxW,
      maxH: config.maxH,
      locked: config.locked,
      noMove: config.noMove,
      noResize: config.noResize,
    };

    this.grid.addWidget(gsWidget);

    requestAnimationFrame(() => {
      const internal = this.widgets.get(id);
      if (internal) {
        internal.config = config;
        this.config.widgets.push(config);
        this.refreshWidgetContent(id);
        if (config.locked) {
          this.grid.update(internal.element, { locked: true, noMove: true, noResize: true });
        }
      }
    });

    return id;
  }

  clearAll(): void {
    this.grid.removeAll();
    this.widgets.clear();
    this.config.widgets = [];
    this.deselect();
    this.pushHistory();
  }

  // ─── 配置操作 ────────────────────────────────────────────

  loadConfig(config: GridConfig): void {
    this.config = mergeDefaults(config);

    this.grid.removeAll();
    this.widgets.clear();

    this.grid.column(this.config.columns);
    this.grid.cellHeight(this.config.cellHeight);
    this.grid.setStatic(this.config.staticGrid);

    for (const w of this.config.widgets) {
      this.addWidgetFromConfig(w);
    }

    this.emit('grid:load', { config: this.config });
    this.history.clear();
  }

  getConfig(): GridConfig {
    return deepClone(this.config);
  }

  setColumns(cols: number): void {
    this.config.columns = cols;
    this.grid.column(cols);
    this.toolbar.setColumns(cols);
    this.pushHistory();
  }

  setStatic(isStatic: boolean): void {
    this.config.staticGrid = isStatic;
    this.grid.setStatic(isStatic);
    this.toolbar.setStatic(isStatic);
  }

  // ─── 预览 ────────────────────────────────────────────────

  togglePreview(): void {
    this.isPreview = !this.isPreview;
    this.container.classList.toggle('gct-editor--preview', this.isPreview);
    this.grid.setStatic(this.isPreview);
    this.emit('mode:change', { mode: this.isPreview ? 'preview' : 'edit' });
  }

  // ─── 网格线 ──────────────────────────────────────────────

  toggleGridLines(): void {
    this.gridLinesVisible = !this.gridLinesVisible;
    const linesEl = this.container.querySelector('.gct-grid-lines') as HTMLElement;
    if (linesEl) {
      linesEl.style.display = this.gridLinesVisible ? '' : 'none';
      if (this.gridLinesVisible) this.renderGridLines(linesEl);
    }
  }

  private renderGridLines(el: HTMLElement): void {
    const cols = this.config.columns;
    const rows = this.config.maxRows || 20;

    el.innerHTML = '';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = document.createElement('div');
        cell.className = 'gct-grid-cell';
        cell.style.gridColumn = `${x + 1} / ${x + 2}`;
        cell.style.gridRow = `${y + 1} / ${y + 2}`;
        el.appendChild(cell);
      }
    }
    el.style.display = 'grid';
    el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    el.style.gridAutoRows = `${this.config.cellHeight || 80}px`;
    el.style.gap = `${this.config.margin ?? 10}px`;
    el.style.position = 'absolute';
    el.style.inset = '0';
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.15';
  }

  // ─── Widget 库 ───────────────────────────────────────────

  private initWidgetLibrary(): void {
    const slot = this.container.querySelector('.gct-editor__lib-slot') as HTMLElement;
    this.widgetLibrary = new WidgetLibrary(slot, {
      onAdd: (config) => this.addWidgetFromConfig(config),
    });
  }

  // ─── 右键菜单 ────────────────────────────────────────────

  private initContextMenu(): void {
    this.contextMenu = new ContextMenu();

    // 网格空白区域右键
    this.gridEl.addEventListener('contextmenu', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.grid-stack-item') || target.closest('.gct-widget')) return;

      e.preventDefault();
      this.contextMenu.show(e.clientX, e.clientY, createGridContextMenu({
        addWidget: () => this.addWidget(),
        paste: () => this.pasteFromClipboard(),
        selectAll: () => this.selectAllWidgets(),
        clearAll: () => { if (confirm('清空所有？')) this.clearAll(); },
        toggleGridLines: () => this.toggleGridLines(),
        toggleSnap: () => { this.alignGuides?.setSnapEnabled(!this.alignGuides); },
        resetLayout: () => { if (confirm('重置布局？')) this.loadConfig(mergeDefaults({ columns: this.config.columns })); },
      }));
    });
  }

  private showWidgetContextMenu(x: number, y: number, id: string): void {
    const internal = this.widgets.get(id);
    if (!internal) return;

    this.contextMenu.show(x, y, createWidgetContextMenu({
      edit: () => this.startInlineEdit(id),
      duplicate: () => this.duplicateWidget(id),
      copy: () => this.copyWidgetConfig(id),
      lock: () => this.updateWidget(id, { locked: true, noMove: true, noResize: true }),
      unlock: () => this.updateWidget(id, { locked: false, noMove: false, noResize: false }),
      isLocked: internal.config.locked,
      hide: () => this.updateWidget(id, { visible: false }),
      bringToFront: () => this.bringToFront(id),
      sendToBack: () => this.sendToBack(id),
      delete: () => this.removeWidget(id),
      saveAsTemplate: () => this.saveWidgetAsTemplate(id),
    }));
  }

  // ─── 对齐辅助线 ──────────────────────────────────────────

  private initAlignGuides(): void {
    const canvasEl = this.container.querySelector('.gct-grid-container') as HTMLElement;
    this.alignGuides = new AlignGuides(canvasEl);
  }

  // ─── 缩放 ────────────────────────────────────────────────

  private initZoom(): void {
    const canvasEl = this.container.querySelector('.gct-editor__canvas') as HTMLElement;
    const contentEl = this.container.querySelector('.gct-grid-container') as HTMLElement;
    this.zoomController = new ZoomController(canvasEl, contentEl);

    // 注入缩放控制条到工具栏
    const toolbarSlot = this.container.querySelector('.gct-editor__toolbar-slot') as HTMLElement;
    const controls = this.zoomController.renderControls();
    controls.style.marginLeft = 'auto';
    // 工具栏加载后追加
    requestAnimationFrame(() => {
      const toolbar = toolbarSlot.querySelector('.gct-toolbar');
      if (toolbar) toolbar.appendChild(controls);
    });
  }

  // ─── 设备预览 ────────────────────────────────────────────

  private initDeviceFrame(): void {
    const wrapperEl = this.container.querySelector('.gct-grid-container') as HTMLElement;
    this.deviceFrame = new DeviceFrame(wrapperEl);
  }

  // ─── 多选 ────────────────────────────────────────────────

  private initSelection(): void {
    this.selectionManager = new SelectionManager(this.gridEl, {
      onSelect: (ids) => {
        if (ids.length === 1) {
          this.select(ids[0]);
        } else if (ids.length > 1) {
          // 多选高亮
          for (const id of ids) {
            const w = this.widgets.get(id);
            w?.element.classList.add('gct-widget--multi-selected');
          }
        }
      },
      onDeselect: () => this.deselect(),
      onBatchDelete: (ids) => {
        for (const id of ids) this.removeWidget(id);
      },
      onBatchLock: (ids, locked) => {
        for (const id of ids) {
          this.updateWidget(id, { locked, noMove: locked, noResize: locked });
        }
      },
      onBatchMove: (ids, dx, dy) => {
        for (const id of ids) {
          const w = this.widgets.get(id);
          if (w && !w.config.locked) {
            const newRect = {
              ...w.config.rect,
              x: Math.max(0, w.config.rect.x + dx),
              y: Math.max(0, w.config.rect.y + dy),
            };
            this.updateWidget(id, { rect: newRect });
          }
        }
      },
    });
  }

  // ─── 快照 ────────────────────────────────────────────────

  private initSnapshots(): void {
    this.snapshotManager = new SnapshotManager(20, 'gct-snapshots');
  }

  saveSnapshot(name?: string): void {
    this.snapshotManager.save(this.getConfig(), name);
  }

  restoreSnapshot(id: string): void {
    const config = this.snapshotManager.restore(id);
    if (config) this.loadConfig(config);
  }

  // ─── 剪贴板操作 ──────────────────────────────────────────

  private copiedConfig: WidgetConfig | null = null;

  private copyWidgetConfig(id: string): void {
    const internal = this.widgets.get(id);
    if (internal) {
      this.copiedConfig = deepClone(internal.config);
      navigator.clipboard?.writeText(JSON.stringify(this.copiedConfig, null, 2));
    }
  }

  private pasteFromClipboard(): void {
    if (this.copiedConfig) {
      const config = deepClone(this.copiedConfig);
      config.id = uid();
      config.rect.y += 1;
      this.addWidgetFromConfig(config);
    }
  }

  // ─── 层级操作 ────────────────────────────────────────────

  private bringToFront(id: string): void {
    const internal = this.widgets.get(id);
    if (!internal) return;
    const maxZ = Math.max(...Array.from(this.widgets.values()).map((w) => w.config.zIndex ?? 0));
    this.updateWidget(id, { zIndex: maxZ + 1 });
  }

  private sendToBack(id: string): void {
    const internal = this.widgets.get(id);
    if (!internal) return;
    const minZ = Math.min(...Array.from(this.widgets.values()).map((w) => w.config.zIndex ?? 0));
    this.updateWidget(id, { zIndex: minZ - 1 });
  }

  // ─── 模板保存 ────────────────────────────────────────────

  private saveWidgetAsTemplate(id: string): void {
    const internal = this.widgets.get(id);
    if (!internal) return;
    const name = prompt('模板名称:');
    if (name) {
      this.widgetLibrary.saveCustomTemplate(name, 'box', internal.config);
    }
  }

  // ─── 全选 ────────────────────────────────────────────────

  private selectAllWidgets(): void {
    const ids = Array.from(this.widgets.keys());
    this.selectionManager?.selectAll(ids);
  }

  // ─── 导出 ────────────────────────────────────────────────

  exportJSON(): string { return toJSON(this.config); }
  exportCSS(): string { return exportLayout(this.config, { format: 'css' }); }
  exportHTML(): string { return exportLayout(this.config, { format: 'html' }); }
  exportVue(name?: string): string { return exportLayout(this.config, { format: 'vue' }); }
  exportReact(name?: string): string { return exportLayout(this.config, { format: 'react' }); }

  // ─── 工具栏初始化 ────────────────────────────────────────

  private initToolbar(): void {
    const slot = this.container.querySelector('.gct-editor__toolbar-slot') as HTMLElement;
    this.toolbar = new Toolbar(slot, {
      addWidget: (w, h) => this.addWidget(w, h),
      clearAll: () => this.clearAll(),
      save: () => this.save(),
      load: (json) => {
        try {
          const config = fromJSON(json);
          this.loadConfig(config);
        } catch (e) {
          console.error('[GCT Editor] Load failed:', e);
        }
      },
      undo: () => this.undo(),
      redo: () => this.redo(),
      togglePreview: () => this.togglePreview(),
      exportCSS: () => this.downloadFile('layout.css', this.exportCSS(), 'text/css'),
      exportJSON: () => this.downloadFile('layout.json', this.exportJSON(), 'application/json'),
      exportHTML: () => this.downloadFile('layout.html', this.exportHTML(), 'text/html'),
      toggleGridLines: () => this.toggleGridLines(),
      setColumns: (cols) => this.setColumns(cols),
      toggleStatic: () => this.setStatic(!this.config.staticGrid),
      duplicate: () => {
        if (this.selectedId) this.duplicateWidget(this.selectedId);
      },
    }, this.editorConfig);
  }

  // ─── 属性面板初始化 ──────────────────────────────────────

  private initPropertyPanel(): void {
    const slot = this.container.querySelector('.gct-editor__panel-slot') as HTMLElement;
    this.propertyPanel = new PropertyPanel(slot, {
      onUpdate: (id, changes) => this.updateWidget(id, changes),
      onDelete: (id) => this.removeWidget(id),
      onDuplicate: (id) => this.duplicateWidget(id),
      onLock: (id, locked) => this.updateWidget(id, { locked, noMove: locked, noResize: locked }),
      onVisibility: (id, visible) => this.updateWidget(id, { visible }),
    });
  }

  // ─── 键盘快捷键 ──────────────────────────────────────────

  private initKeyboard(): void {
    const handler = (e: KeyboardEvent) => {
      if (this._destroyed) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).contentEditable === 'true') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z') {
        e.preventDefault();
        this.undo();
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        this.redo();
      } else if (ctrl && e.key === 's') {
        e.preventDefault();
        this.save();
      } else if (ctrl && e.key === 'a') {
        e.preventDefault();
        this.selectAllWidgets();
      } else if (ctrl && e.key === 'c') {
        if (this.selectedId) this.copyWidgetConfig(this.selectedId);
      } else if (ctrl && e.key === 'v') {
        this.pasteFromClipboard();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedId) {
          e.preventDefault();
          this.removeWidget(this.selectedId);
        }
      } else if (e.key === 'a' || e.key === 'A') {
        if (!ctrl) {
          e.preventDefault();
          this.addWidget(2, 2);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (!ctrl) {
          e.preventDefault();
          this.togglePreview();
        }
      } else if (e.key === 'Escape') {
        this.deselect();
      } else if (e.key === 'd' || e.key === 'D') {
        if (!ctrl && this.selectedId) {
          e.preventDefault();
          this.duplicateWidget(this.selectedId);
        }
      } else if (e.key === 'l' || e.key === 'L') {
        if (!ctrl && this.selectedId) {
          e.preventDefault();
          const w = this.widgets.get(this.selectedId);
          if (w) this.updateWidget(this.selectedId, { locked: !w.config.locked });
        }
      }
    };

    document.addEventListener('keydown', handler);
    (this as any)._keyHandler = handler;
  }

  // ─── 撤销/重做 ────────────────────────────────────────────

  private pushHistory(): void {
    this.history.push(this.config);
  }

  undo(): void {
    const prev = this.history.undo(this.config);
    if (prev) this.loadConfig(prev);
  }

  redo(): void {
    const next = this.history.redo(this.config);
    if (next) this.loadConfig(next);
  }

  // ─── 保存/加载 ────────────────────────────────────────────

  save(): void {
    saveToStorage(this.config);
    this.snapshotManager.save(this.getConfig(), '自动保存');
    this.editorConfig.onSave?.(this.config);
    this.emit('grid:save', { config: this.config });
  }

  loadFromStorage(): boolean {
    const config = loadFromStorage();
    if (config) {
      this.loadConfig(config);
      return true;
    }
    return false;
  }

  // ─── 自动保存 ─────────────────────────────────────────────

  private initAutoSave(): void {
    this.autoSaveTimer = window.setInterval(() => {
      if (!this._destroyed) {
        saveToStorage(this.config);
        this.editorConfig.onChange?.(this.config);
      }
    }, 30000);
  }

  // ─── 事件 ────────────────────────────────────────────────

  on<K extends keyof GridEventMap>(event: K, handler: (event: GridEventMap[K]) => void): () => void {
    return this.events.on(event, handler);
  }

  private emit<K extends keyof GridEventMap>(event: K, data: GridEventMap[K]): void {
    this.events.emit(event, data);
    this.editorConfig.onChange?.(this.config);
  }

  // ─── 工具 ────────────────────────────────────────────────

  private downloadFile(name: string, content: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── 销毁 ────────────────────────────────────────────────

  destroy(): void {
    this._destroyed = true;
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    if ((this as any)._keyHandler) {
      document.removeEventListener('keydown', (this as any)._keyHandler);
    }
    this.grid.destroy();
    this.toolbar.destroy();
    this.propertyPanel.destroy();
    this.widgetLibrary?.destroy();
    this.contextMenu?.destroy();
    this.alignGuides?.destroy();
    this.zoomController?.destroy();
    this.deviceFrame?.destroy();
    this.selectionManager?.destroy();
    this.snapshotManager?.destroy();
    this.events.clear();
    this.container.innerHTML = '';
    this.container.classList.remove('gct-editor', 'gct-editor--dark', 'gct-editor--preview');
  }
}

export { Toolbar } from './toolbar';
export { PropertyPanel } from './property-panel';
export { HistoryManager } from './history';
export { WidgetLibrary } from './widget-library';
export { ContextMenu } from './context-menu';
export { AlignGuides } from './align-guides';
export { ZoomController, DeviceFrame } from './zoom';
export { SelectionManager } from './selection';
export { SnapshotManager } from './snapshots';
