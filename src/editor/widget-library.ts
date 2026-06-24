/**
 * Widget 库面板 - 预设模板 + 自定义模板
 * 
 * 支持拖拽到网格、点击添加、自定义模板管理
 */

import type { WidgetConfig, GridConfig } from '../types';
import { uid, deepClone } from '../core/converter';
import { createIcon } from '../utils/icons';

/** Widget 模板定义 */
export interface WidgetTemplate {
  id: string;
  name: string;
  icon: string;
  category: string;
  defaultSize: { w: number; h: number };
  content?: string;
  className?: string;
  style?: Record<string, string>;
  data?: Record<string, unknown>;
  minW?: number;
  minH?: number;
  /** 自定义渲染 (缩略图) */
  thumbnail?: string;
}

/** 内置模板库 */
const BUILT_IN_TEMPLATES: WidgetTemplate[] = [
  // 布局组件
  { id: 'tpl_header', name: '顶栏', icon: 'layout', category: '布局', defaultSize: { w: 12, h: 1 }, content: 'Header', className: 'layout-header' },
  { id: 'tpl_sidebar', name: '侧边栏', icon: 'sidebar', category: '布局', defaultSize: { w: 3, h: 8 }, content: 'Sidebar', className: 'layout-sidebar' },
  { id: 'tpl_footer', name: '底栏', icon: 'layout', category: '布局', defaultSize: { w: 12, h: 1 }, content: 'Footer', className: 'layout-footer' },
  { id: 'tpl_card', name: '卡片', icon: 'square', category: '布局', defaultSize: { w: 4, h: 3 }, content: 'Card Content', className: 'card' },
  { id: 'tpl_panel', name: '面板', icon: 'panel-left', category: '布局', defaultSize: { w: 6, h: 4 }, content: 'Panel', className: 'panel' },
  { id: 'tpl_divider', name: '分割线', icon: 'minus', category: '布局', defaultSize: { w: 12, h: 1 }, content: '', className: 'divider' },
  { id: 'tpl_spacer', name: '占位', icon: 'maximize', category: '布局', defaultSize: { w: 4, h: 2 }, content: '', className: 'spacer' },

  // 数据展示
  { id: 'tpl_chart', name: '图表', icon: 'bar-chart-3', category: '数据', defaultSize: { w: 6, h: 4 }, content: 'Chart Area', className: 'chart' },
  { id: 'tpl_table', name: '表格', icon: 'table', category: '数据', defaultSize: { w: 8, h: 5 }, content: 'Table', className: 'table-wrapper' },
  { id: 'tpl_stat', name: '统计卡', icon: 'trending-up', category: '数据', defaultSize: { w: 3, h: 2 }, content: '1,234', className: 'stat-card' },
  { id: 'tpl_list', name: '列表', icon: 'list', category: '数据', defaultSize: { w: 4, h: 5 }, content: 'List', className: 'list-wrapper' },
  { id: 'tpl_metric', name: '指标', icon: 'target', category: '数据', defaultSize: { w: 2, h: 2 }, content: '98%', className: 'metric' },
  { id: 'tpl_progress', name: '进度条', icon: 'activity', category: '数据', defaultSize: { w: 4, h: 1 }, content: '75%', className: 'progress-bar' },

  // 表单控件
  { id: 'tpl_input', name: '输入框', icon: 'type', category: '表单', defaultSize: { w: 4, h: 1 }, content: 'Input', className: 'form-field' },
  { id: 'tpl_button', name: '按钮', icon: 'square', category: '表单', defaultSize: { w: 2, h: 1 }, content: 'Button', className: 'btn' },
  { id: 'tpl_form', name: '表单', icon: 'file-text', category: '表单', defaultSize: { w: 6, h: 6 }, content: 'Form', className: 'form' },
  { id: 'tpl_search', name: '搜索栏', icon: 'search', category: '表单', defaultSize: { w: 6, h: 1 }, content: 'Search...', className: 'search-bar' },

  // 媒体
  { id: 'tpl_image', name: '图片', icon: 'image', category: '媒体', defaultSize: { w: 4, h: 3 }, content: 'Image', className: 'image-wrapper' },
  { id: 'tpl_video', name: '视频', icon: 'video', category: '媒体', defaultSize: { w: 6, h: 4 }, content: 'Video Player', className: 'video-wrapper' },
  { id: 'tpl_avatar', name: '头像', icon: 'user', category: '媒体', defaultSize: { w: 2, h: 2 }, content: 'Avatar', className: 'avatar' },
  { id: 'tpl_gallery', name: '相册', icon: 'images', category: '媒体', defaultSize: { w: 6, h: 4 }, content: 'Gallery', className: 'gallery' },

  // 导航
  { id: 'tpl_tabs', name: '标签页', icon: 'columns-3', category: '导航', defaultSize: { w: 8, h: 1 }, content: 'Tab1 | Tab2 | Tab3', className: 'tabs' },
  { id: 'tpl_breadcrumb', name: '面包屑', icon: 'chevrons-right', category: '导航', defaultSize: { w: 8, h: 1 }, content: 'Home > Page > Sub', className: 'breadcrumb' },
  { id: 'tpl_pagination', name: '分页', icon: 'more-horizontal', category: '导航', defaultSize: { w: 6, h: 1 }, content: '< 1 2 3 >', className: 'pagination' },
  { id: 'tpl_nav', name: '导航栏', icon: 'menu', category: '导航', defaultSize: { w: 12, h: 1 }, content: 'Navigation', className: 'nav-bar' },
];

export interface WidgetLibraryCallbacks {
  onAdd: (config: WidgetConfig) => void;
}

export class WidgetLibrary {
  private el: HTMLElement;
  private templates: WidgetTemplate[];
  private customTemplates: WidgetTemplate[] = [];
  private callbacks: WidgetLibraryCallbacks;
  private searchInput!: HTMLInputElement;
  private listEl!: HTMLElement;
  private categories: string[] = [];
  private activeCategory = 'all';
  private collapsed = false;

  private static STORAGE_KEY = 'gct-custom-templates';

  constructor(container: HTMLElement, callbacks: WidgetLibraryCallbacks, customTemplates?: WidgetTemplate[]) {
    this.callbacks = callbacks;
    this.templates = [...BUILT_IN_TEMPLATES, ...(customTemplates ?? [])];
    this.loadCustomTemplates();

    this.el = document.createElement('div');
    this.el.className = 'gct-widget-library';
    this.render();
    container.appendChild(this.el);
  }

  private render(): void {
    this.categories = ['all', ...new Set(this.templates.map((t) => t.category))];

    this.el.innerHTML = `
      <div class="gct-lib__header">
        <h3 class="gct-lib__title">${createIcon('package', 18)} Widget 库</h3>
        <button class="gct-lib__toggle" title="收起/展开">
          ${createIcon('chevron-left')}
        </button>
      </div>
      <div class="gct-lib__body">
        <div class="gct-lib__search">
          <input type="text" placeholder="搜索 Widget..." class="gct-lib__search-input" />
        </div>
        <div class="gct-lib__categories">
          ${this.categories.map((c) => `
            <button class="gct-lib__cat ${c === this.activeCategory ? 'gct-lib__cat--active' : ''}" data-cat="${c}">
              ${c === 'all' ? '全部' : c}
            </button>
          `).join('')}
        </div>
        <div class="gct-lib__list"></div>
        <div class="gct-lib__footer">
          <button class="gct-lib__save-tpl" title="从当前选中 Widget 保存为模板">
            ${createIcon('save', 14)} 保存为模板
          </button>
        </div>
      </div>
    `;

    this.searchInput = this.el.querySelector('.gct-lib__search-input')!;
    this.listEl = this.el.querySelector('.gct-lib__list')!;

    this.bindEvents();
    this.renderList();
  }

  private bindEvents(): void {
    // 搜索
    this.searchInput.addEventListener('input', () => this.renderList());

    // 分类
    this.el.querySelectorAll('.gct-lib__cat').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeCategory = (btn as HTMLElement).dataset.cat!;
        this.el.querySelectorAll('.gct-lib__cat').forEach((b) => b.classList.remove('gct-lib__cat--active'));
        btn.classList.add('gct-lib__cat--active');
        this.renderList();
      });
    });

    // 折叠
    this.el.querySelector('.gct-lib__toggle')?.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      this.el.classList.toggle('gct-lib--collapsed', this.collapsed);
    });

    // 保存模板
    this.el.querySelector('.gct-lib__save-tpl')?.addEventListener('click', () => {
      const name = prompt('模板名称:');
      if (!name) return;
      const icon = prompt('图标名称 (lucide 图标名):', 'box') ?? 'box';
      this.saveCustomTemplate(name, icon);
    });
  }

  private renderList(): void {
    const query = this.searchInput.value.toLowerCase().trim();
    let filtered = this.templates;

    if (this.activeCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === this.activeCategory);
    }
    if (query) {
      filtered = filtered.filter(
        (t) => t.name.toLowerCase().includes(query) || t.category.toLowerCase().includes(query)
      );
    }

    this.listEl.innerHTML = filtered.map((t) => `
      <div class="gct-lib__item" draggable="true" data-tpl-id="${t.id}" title="${t.name} (${t.defaultSize.w}x${t.defaultSize.h})">
        <span class="gct-lib__item-icon">${createIcon(t.icon, 16)}</span>
        <span class="gct-lib__item-name">${t.name}</span>
        <span class="gct-lib__item-size">${t.defaultSize.w}x${t.defaultSize.h}</span>
        ${t.id.startsWith('custom_') ? `<button class="gct-lib__item-del" data-del="${t.id}" title="删除">${createIcon('x', 12)}</button>` : ''}
      </div>
    `).join('');

    // 绑定拖拽和点击
    this.listEl.querySelectorAll('.gct-lib__item').forEach((item) => {
      const el = item as HTMLElement;
      const tplId = el.dataset.tplId!;
      const tpl = this.templates.find((t) => t.id === tplId);
      if (!tpl) return;

      // 拖拽开始
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer!.setData('application/gct-widget', JSON.stringify(tpl));
        e.dataTransfer!.effectAllowed = 'copy';
        el.classList.add('gct-lib__item--dragging');
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('gct-lib__item--dragging');
      });

      // 点击添加
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).dataset.del) return;
        this.addFromTemplate(tpl);
      });
    });

    // 删除自定义模板
    this.listEl.querySelectorAll('.gct-lib__item-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.del!;
        this.deleteCustomTemplate(id);
      });
    });
  }

  private addFromTemplate(tpl: WidgetTemplate): void {
    const config: WidgetConfig = {
      id: uid(),
      rect: { x: 0, y: 0, w: tpl.defaultSize.w, h: tpl.defaultSize.h },
      content: tpl.content ?? '',
      contentType: 'text',
      className: tpl.className,
      style: tpl.style as any,
      data: tpl.data,
      minW: tpl.minW,
      minH: tpl.minH,
      autoPosition: true,
      visible: true,
    };
    this.callbacks.onAdd(config);
  }

  /** 外部调用：处理拖放到网格 */
  handleDrop(dataTransfer: DataTransfer): WidgetConfig | null {
    const raw = dataTransfer.getData('application/gct-widget');
    if (!raw) return null;
    try {
      const tpl: WidgetTemplate = JSON.parse(raw);
      const config: WidgetConfig = {
        id: uid(),
        rect: { x: 0, y: 0, w: tpl.defaultSize.w, h: tpl.defaultSize.h },
        content: tpl.content ?? '',
        contentType: 'text',
        className: tpl.className,
        style: tpl.style as any,
        data: tpl.data,
        minW: tpl.minW,
        minH: tpl.minH,
        autoPosition: true,
        visible: true,
      };
      return config;
    } catch {
      return null;
    }
  }

  // ─── 自定义模板管理 ─────────────────────────────────────

  private loadCustomTemplates(): void {
    try {
      const raw = localStorage.getItem(WidgetLibrary.STORAGE_KEY);
      if (raw) {
        this.customTemplates = JSON.parse(raw);
        this.templates = [...BUILT_IN_TEMPLATES, ...this.customTemplates];
      }
    } catch { /* ignore */ }
  }

  private saveCustomTemplates(): void {
    localStorage.setItem(WidgetLibrary.STORAGE_KEY, JSON.stringify(this.customTemplates));
  }

  saveCustomTemplate(name: string, icon: string, widget?: WidgetConfig): void {
    const w = widget; // 外部传入选中的 widget
    const tpl: WidgetTemplate = {
      id: `custom_${uid()}`,
      name,
      icon,
      category: '自定义',
      defaultSize: w ? { w: w.rect.w, h: w.rect.h } : { w: 4, h: 3 },
      content: w?.content ?? '',
      className: w?.className,
      style: w?.style as any,
      data: w?.data,
    };
    this.customTemplates.push(tpl);
    this.templates = [...BUILT_IN_TEMPLATES, ...this.customTemplates];
    this.saveCustomTemplates();
    this.renderList();
  }

  deleteCustomTemplate(id: string): void {
    this.customTemplates = this.customTemplates.filter((t) => t.id !== id);
    this.templates = [...BUILT_IN_TEMPLATES, ...this.customTemplates];
    this.saveCustomTemplates();
    this.renderList();
  }

  destroy(): void {
    this.el.remove();
  }
}
