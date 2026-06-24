/**
 * GCT Preview - 纯 CSS Grid 预览渲染器
 *
 * 将 GridStack 配置渲染为完全等价的 CSS Grid 布局
 * 不依赖 GridStack.js，体积小，适合生产环境
 */

import type {
  GridConfig,
  WidgetConfig,
  PreviewConfig,
  CSSGridOutput,
  GridEventMap,
} from '../types';
import { EventBus } from '../core/events';
import {
  toCSSGrid,
  mergeDefaults,
  rectToPlacement,
  uid,
  safeSelector,
} from '../core/converter';

export class Preview {
  private container: HTMLElement;
  private wrapperEl!: HTMLElement;
  private config: GridConfig;
  private previewConfig: PreviewConfig;
  private events = new EventBus();
  private widgets = new Map<string, { config: WidgetConfig; element: HTMLElement }>();
  private styleEl!: HTMLStyleElement;
  private resizeObserver: ResizeObserver | null = null;
  private currentBreakpoint: string | null = null;
  private _destroyed = false;

  constructor(previewConfig: PreviewConfig) {
    this.previewConfig = previewConfig;

    const container =
      typeof previewConfig.container === 'string'
        ? document.querySelector<HTMLElement>(previewConfig.container)
        : previewConfig.container;
    if (!container) throw new Error(`[GCT Preview] Container not found: ${previewConfig.container}`);
    this.container = container;

    this.config = mergeDefaults(previewConfig.config);

    this.buildDOM();
    this.injectStyles();
    this.renderWidgets();
    this.initResponsive();
  }

  // ─── DOM 构建 ────────────────────────────────────────────

  private buildDOM(): void {
    this.container.classList.add('gct-preview');

    // 创建样式元素
    this.styleEl = document.createElement('style');
    this.styleEl.id = `gct-preview-${uid()}`;
    document.head.appendChild(this.styleEl);

    // 创建网格容器
    this.wrapperEl = document.createElement('div');
    this.wrapperEl.className = 'gct-grid';
    this.container.appendChild(this.wrapperEl);
  }

  // ─── 样式注入 ────────────────────────────────────────────

  private injectStyles(): void {
    const output = toCSSGrid(this.config);
    this.styleEl.textContent = this.generateFullStylesheet(output);
  }

  private generateFullStylesheet(output: CSSGridOutput): string {
    const bp = this.previewConfig.breakpoint;
    const activeBreakpoint = bp
      ? this.config.responsive?.breakpoints.find((b) => b.name === bp)
      : null;

    let css = `
/* GCT Preview Styles */
*, *::before, *::after { box-sizing: border-box; }

.gct-preview {
  width: 100%;
  overflow: auto;
}

.gct-grid {
  ${output.containerCSS}
  width: 100%;
}

/* Widget base styles */
.gct-grid > [data-gct-id] {
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

${this.previewConfig.animate !== false ? `
.gct-grid > [data-gct-id] {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}` : ''}
`;

    // Widget 样式
    for (const [id, css_] of output.widgetCSS) {
      const w = this.config.widgets.find((w) => w.id === id);
      if (!w || w.visible === false) continue;

      css += `
.gct-grid > [data-gct-id="${safeSelector(id)}"] {
  ${css_}
}
`;
    }

    // 响应式断点
    if (this.config.responsive?.breakpoints) {
      for (const bp of this.config.responsive.breakpoints) {
        const mediaQuery = bp.maxWidth
          ? `@media (max-width: ${bp.maxWidth}px)`
          : bp.minWidth
          ? `@media (min-width: ${bp.minWidth}px)`
          : null;
        if (!mediaQuery) continue;

        css += `
${mediaQuery} {
  .gct-grid {
    grid-template-columns: repeat(${bp.columns}, 1fr);
    ${bp.cellHeight ? `grid-auto-rows: ${bp.cellHeight}px;` : ''}
    ${bp.gap !== undefined ? `gap: ${bp.gap}px;` : ''}
    ${bp.margin !== undefined
      ? `padding: ${Array.isArray(bp.margin) ? `${bp.margin[1]}px ${bp.margin[0]}px` : `${bp.margin}px`};`
      : ''
    }
  }
`;
        // Widget 响应式覆盖
        for (const w of this.config.widgets) {
          if (w.responsive?.[bp.name]) {
            const override = { ...w.rect, ...w.responsive[bp.name] };
            const p = rectToPlacement(override);
            css += `
  .gct-grid > [data-gct-id="${safeSelector(w.id)}"] {
    grid-column: ${p.columnStart} / ${p.columnEnd};
    grid-row: ${p.rowStart} / ${p.rowEnd};
  }
`;
          }
        }

        css += `}\n`;
      }
    }

    return css;
  }

  // ─── Widget 渲染 ─────────────────────────────────────────

  private renderWidgets(): void {
    this.wrapperEl.innerHTML = '';
    this.widgets.clear();

    for (const w of this.config.widgets) {
      if (w.visible === false) continue;

      const el = document.createElement('div');
      el.dataset.gctId = w.id;

      // 类名
      const classes = ['gct-widget'];
      if (w.className) classes.push(w.className);
      el.className = classes.join(' ');

      // 内联样式
      if (w.style) {
        for (const [key, val] of Object.entries(w.style)) {
          if (val) el.style.setProperty(key.replace(/([A-Z])/g, '-$1').toLowerCase(), String(val));
        }
      }

      // data 属性
      if (w.data) {
        for (const [key, val] of Object.entries(w.data)) {
          el.dataset[key] = String(val);
        }
      }

      // z-index
      if (w.zIndex !== undefined) el.style.zIndex = String(w.zIndex);

      // 内容
      if (this.previewConfig.widgetRenderer) {
        const rendered = this.previewConfig.widgetRenderer(w);
        if (typeof rendered === 'string') {
          el.innerHTML = rendered;
        } else {
          el.appendChild(rendered);
        }
      } else {
        if (w.contentType === 'html') {
          el.innerHTML = w.content ?? '';
        } else {
          el.textContent = w.content ?? '';
        }
      }

      // 子网格
      if (w.subGrid) {
        const subContainer = document.createElement('div');
        subContainer.className = 'gct-grid';
        const subOutput = toCSSGrid(w.subGrid);
        subContainer.style.cssText = subOutput.containerCSS;

        for (const sub of w.subGrid.widgets) {
          if (sub.visible === false) continue;
          const subEl = document.createElement('div');
          subEl.dataset.gctId = sub.id;
          const subCSS = subOutput.widgetCSS.get(sub.id);
          if (subCSS) subEl.style.cssText = subCSS;
          subEl.textContent = sub.content ?? '';
          subContainer.appendChild(subEl);
        }

        el.appendChild(subContainer);
      }

      this.wrapperEl.appendChild(el);
      this.widgets.set(w.id, { config: w, element: el });
    }
  }

  // ─── 响应式 ──────────────────────────────────────────────

  private initResponsive(): void {
    if (!this.previewConfig.responsive) return;

    const breakpoints = this.config.responsive?.breakpoints ?? [];
    if (breakpoints.length === 0) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      if (this._destroyed) return;
      const width = entries[0]?.contentRect.width;
      if (width === undefined) return;

      // 找到匹配的断点 (最大宽度优先)
      const sorted = [...breakpoints].sort((a, b) => (b.maxWidth ?? Infinity) - (a.maxWidth ?? Infinity));
      const matched = sorted.find((bp) => !bp.maxWidth || width <= bp.maxWidth);

      if (matched && matched.name !== this.currentBreakpoint) {
        this.currentBreakpoint = matched.name;
        this.events.emit('breakpoint:change', { breakpoint: matched });
        // 重新注入样式（响应式已包含在 stylesheet 中）
      }
    });

    this.resizeObserver.observe(this.container);
  }

  // ─── 更新配置 ────────────────────────────────────────────

  update(config: GridConfig): void {
    this.config = mergeDefaults(config);
    this.injectStyles();
    this.renderWidgets();
  }

  updateWidget(id: string, changes: Partial<WidgetConfig>): void {
    const w = this.config.widgets.find((w) => w.id === id);
    if (!w) return;
    Object.assign(w, changes);
    this.injectStyles();
    this.renderWidgets();
  }

  setBreakpoint(name: string): void {
    this.previewConfig.breakpoint = name;
    this.injectStyles();
  }

  // ─── 导出当前渲染 ────────────────────────────────────────

  getOutput(): CSSGridOutput {
    return toCSSGrid(this.config);
  }

  toCSS(): string {
    return toCSSGrid(this.config).stylesheet;
  }

  toHTML(): string {
    return toCSSGrid(this.config).html;
  }

  toStandaloneHTML(title?: string): string {
    const output = toCSSGrid(this.config);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title ?? 'Grid Preview'}</title>
  <style>
    ${this.styleEl.textContent}
  </style>
</head>
<body>
  ${this.wrapperEl.outerHTML}
</body>
</html>`;
  }

  // ─── 事件 ────────────────────────────────────────────────

  on<K extends keyof GridEventMap>(event: K, handler: (event: GridEventMap[K]) => void): () => void {
    return this.events.on(event, handler);
  }

  // ─── 销毁 ────────────────────────────────────────────────

  destroy(): void {
    this._destroyed = true;
    this.resizeObserver?.disconnect();
    this.styleEl.remove();
    this.container.innerHTML = '';
    this.container.classList.remove('gct-preview');
    this.events.clear();
  }
}
