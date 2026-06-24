/**
 * GridStack ↔ CSS Grid 核心转换引擎
 *
 * 负责：
 * 1. GridStack 布局数据 → CSS Grid 样式
 * 2. CSS Grid 布局 → GridStack 兼容格式
 * 3. 响应式断点映射
 * 4. 命名区域生成
 */

import type {
  GridConfig,
  WidgetConfig,
  GridRect,
  CSSGridPlacement,
  CSSGridOutput,
  ConverterOptions,
  Breakpoint,
} from '../types';

// ─── 工具函数 ──────────────────────────────────────────────

/** 唯一 ID 生成 */
export function uid(): string {
  return 'gct_' + Math.random().toString(36).slice(2, 10);
}

/** 深拷贝 (简单实现，够用) */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** 安全选择器：ID 做 CSS 选择器时转义 */
export function safeSelector(id: string): string {
  return CSS?.escape?.(id) ?? id.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

/** GridRect → CSS Grid placement (1-based) */
export function rectToPlacement(rect: GridRect): CSSGridPlacement {
  return {
    columnStart: rect.x + 1,
    columnEnd: rect.x + 1 + rect.w,
    rowStart: rect.y + 1,
    rowEnd: rect.y + 1 + rect.h,
  };
}

/** CSS Grid placement → GridRect */
export function placementToRect(p: CSSGridPlacement): GridRect {
  return {
    x: p.columnStart - 1,
    y: p.rowStart - 1,
    w: p.columnEnd - p.columnStart,
    h: p.rowEnd - p.rowStart,
  };
}

/** 合并默认配置 */
export function mergeDefaults(config: Partial<GridConfig>): GridConfig {
  return {
    columns: config.columns ?? 12,
    rows: config.rows ?? 0,
    cellHeight: config.cellHeight ?? 80,
    gap: config.gap ?? 10,
    margin: config.margin ?? 10,
    staticGrid: config.staticGrid ?? false,
    animate: config.animate ?? true,
    widgets: config.widgets ?? [],
    responsive: config.responsive,
    acceptWidgets: config.acceptWidgets ?? true,
    alignItems: config.alignItems,
    justifyItems: config.justifyItems,
    autoRows: config.autoRows,
    maxRows: config.maxRows,
    className: config.className,
    data: config.data,
  };
}

// ─── 重叠检测与自动修正 ─────────────────────────────────────

/**
 * 检测 widgets 是否重叠，返回冲突列表
 */
export function detectOverlaps(widgets: WidgetConfig[]): Array<[string, string]> {
  const conflicts: Array<[string, string]> = [];
  for (let i = 0; i < widgets.length; i++) {
    for (let j = i + 1; j < widgets.length; j++) {
      const a = widgets[i].rect;
      const b = widgets[j].rect;
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        conflicts.push([widgets[i].id, widgets[j].id]);
      }
    }
  }
  return conflicts;
}

/**
 * 自动修正重叠：按 y→x 排序后逐个下推
 */
export function resolveOverlaps(widgets: WidgetConfig[], columns: number): WidgetConfig[] {
  const sorted = [...widgets].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const occupied = new Set<string>();

  function occupy(rect: GridRect) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      for (let y = rect.y; y < rect.y + rect.h; y++) {
        occupied.add(`${x},${y}`);
      }
    }
  }

  function isFree(rect: GridRect): boolean {
    if (rect.x < 0 || rect.x + rect.w > columns) return false;
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      for (let y = rect.y; y < rect.y + rect.h; y++) {
        if (occupied.has(`${x},${y}`)) return false;
      }
    }
    return true;
  }

  return sorted.map((w) => {
    const clone = deepClone(w);
    while (!isFree(clone.rect)) {
      clone.rect.y++;
    }
    occupy(clone.rect);
    return clone;
  });
}

// ─── CSS Grid 生成 ─────────────────────────────────────────

/**
 * 生成 CSS Grid 容器样式
 */
export function generateContainerCSS(config: GridConfig, opts: ConverterOptions = { columns: 12 }): string {
  const cols = config.columns || opts.columns;
  const gap = config.gap ?? 10;
  const margin = config.margin ?? 0;
  const marginVal = Array.isArray(margin) ? `${margin[1]}px ${margin[0]}px` : `${margin}px`;

  const lines: string[] = [
    `display: grid;`,
    `grid-template-columns: repeat(${cols}, 1fr);`,
  ];

  // 固定行高 or 自动
  if (config.cellHeight && config.cellHeight > 0) {
    lines.push(`grid-auto-rows: ${config.cellHeight}px;`);
  } else if (config.autoRows) {
    lines.push(`grid-auto-rows: ${config.autoRows};`);
  } else {
    lines.push(`grid-auto-rows: minmax(80px, auto);`);
  }

  if (config.rows && config.rows > 0) {
    lines.push(`grid-template-rows: repeat(${config.rows}, ${config.cellHeight || 80}px);`);
  }

  lines.push(`gap: ${gap}px;`);

  if (marginVal !== '0px') {
    lines.push(`padding: ${marginVal};`);
  }

  if (config.alignItems) lines.push(`align-items: ${config.alignItems};`);
  if (config.justifyItems) lines.push(`justify-items: ${config.justifyItems};`);

  return lines.join('\n  ');
}

/**
 * 生成单个 Widget 的 CSS Grid 放置样式
 */
export function generateWidgetCSS(
  widget: WidgetConfig,
  config: GridConfig,
  opts: ConverterOptions = { columns: 12 }
): string {
  const p = rectToPlacement(widget.rect);
  const lines: string[] = [
    `grid-column: ${p.columnStart} / ${p.columnEnd};`,
    `grid-row: ${p.rowStart} / ${p.rowEnd};`,
  ];

  if (widget.zIndex !== undefined) lines.push(`z-index: ${widget.zIndex};`);

  // 响应式覆盖
  if (widget.responsive) {
    // 响应式在 stylesheet 中单独处理
  }

  return lines.join('\n  ');
}

/**
 * 生成命名网格区域 (grid-template-areas)
 */
export function generateNamedAreas(
  widgets: WidgetConfig[],
  columns: number,
  rows: number,
  prefix = 'w'
): string | null {
  if (rows <= 0) return null;

  // 初始化网格
  const grid: string[][] = Array.from({ length: rows }, () => Array(columns).fill('.'));

  for (const w of widgets) {
    const name = `${prefix}${safeSelector(w.id)}`;
    const shortName = name.slice(0, 8); // 简短名称
    for (let y = w.rect.y; y < w.rect.y + w.rect.h && y < rows; y++) {
      for (let x = w.rect.x; x < w.rect.x + w.rect.w && x < columns; x++) {
        grid[y][x] = shortName;
      }
    }
  }

  const areas = grid.map((row) => `"${row.join(' ')}"`).join('\n    ');
  return `grid-template-areas:\n    ${areas};`;
}

// ─── 主转换器 ──────────────────────────────────────────────

/**
 * GridStack 配置 → CSS Grid Output
 */
export function toCSSGrid(config: GridConfig, opts: ConverterOptions = { columns: 12 }): CSSGridOutput {
  const merged = mergeDefaults(config);
  const columns = merged.columns || opts.columns;
  const useAreas = opts.useNamedAreas ?? false;

  // 计算实际行数
  let rows = merged.rows;
  if (rows <= 0) {
    rows = merged.widgets.reduce((max, w) => Math.max(max, w.rect.y + w.rect.h), 0);
  }

  // 容器 CSS
  let containerCSS = generateContainerCSS(merged, opts);

  // 命名区域
  if (useAreas && rows > 0) {
    const areas = generateNamedAreas(merged.widgets, columns, rows, opts.areaPrefix ?? 'w');
    if (areas) {
      // 替换 grid-template-rows 为命名区域
      containerCSS = containerCSS.replace(/grid-template-rows:[^;]+;/, '');
      containerCSS += '\n  ' + areas;
    }
  }

  // Widget CSS
  const widgetCSS = new Map<string, string>();
  for (const w of merged.widgets) {
    if (w.visible === false) continue;
    let css = generateWidgetCSS(w, merged, opts);
    // 响应式覆盖
    if (w.responsive) {
      for (const [bp, rect] of Object.entries(w.responsive)) {
        const bpConfig = merged.responsive?.breakpoints.find((b) => b.name === bp);
        if (bpConfig && rect) {
          const mediaQuery = bpConfig.maxWidth
            ? `@media (max-width: ${bpConfig.maxWidth}px)`
            : bpConfig.minWidth
            ? `@media (min-width: ${bpConfig.minWidth}px)`
            : null;
          if (mediaQuery) {
            const override: GridRect = { ...w.rect, ...rect };
            const p = rectToPlacement(override);
            css += `\n\n  ${mediaQuery} {\n    grid-column: ${p.columnStart} / ${p.columnEnd};\n    grid-row: ${p.rowStart} / ${p.rowEnd};\n  }`;
          }
        }
      }
    }
    widgetCSS.set(w.id, css);
  }

  // 生成样式表
  const selector = opts.areaPrefix ? `.${opts.areaPrefix}-grid` : '.gct-grid';
  let stylesheet = `${selector} {\n  ${containerCSS}\n}\n`;

  for (const [id, css] of widgetCSS) {
    stylesheet += `\n${selector}__${safeSelector(id)} {\n  ${css}\n}\n`;
  }

  // 响应式断点
  if (merged.responsive?.breakpoints) {
    for (const bp of merged.responsive.breakpoints) {
      const mediaQuery = bp.maxWidth
        ? `@media (max-width: ${bp.maxWidth}px)`
        : bp.minWidth
        ? `@media (min-width: ${bp.minWidth}px)`
        : null;
      if (!mediaQuery) continue;

      const bpCols = bp.columns;
      const bpGap = bp.gap ?? merged.gap;
      const bpMargin = bp.margin ?? merged.margin;
      const marginVal = Array.isArray(bpMargin) ? `${bpMargin[1]}px ${bpMargin[0]}px` : `${bpMargin}px`;
      const cellH = bp.cellHeight ?? merged.cellHeight;

      stylesheet += `\n${mediaQuery} {\n`;
      stylesheet += `  ${selector} {\n`;
      stylesheet += `    grid-template-columns: repeat(${bpCols}, 1fr);\n`;
      if (cellH > 0) stylesheet += `    grid-auto-rows: ${cellH}px;\n`;
      stylesheet += `    gap: ${bpGap}px;\n`;
      if (marginVal !== '0px') stylesheet += `    padding: ${marginVal};\n`;
      stylesheet += `  }\n}\n`;
    }
  }

  // 生成 HTML
  let html = `<div class="${selector.replace('.', '')}">\n`;
  for (const w of merged.widgets) {
    if (w.visible === false) continue;
    const classes = [`${selector.replace('.', '')}__${w.id}`];
    if (w.className) classes.push(w.className);
    const style = w.style
      ? ` style="${Object.entries(w.style)
          .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`)
          .join('; ')}"`
      : '';
    const dataAttrs = w.data
      ? ' ' +
        Object.entries(w.data)
          .map(([k, v]) => `data-${k}="${v}"`)
          .join(' ')
      : '';
    html += `  <div class="${classes.join(' ')}"${style}${dataAttrs}>`;
    if (w.contentType === 'html') {
      html += w.content ?? '';
    } else {
      html += w.content ?? '';
    }
    html += `</div>\n`;
  }
  html += `</div>`;

  return { containerCSS, widgetCSS, stylesheet, html };
}

/**
 * CSS Grid 布局数据 → GridStack WidgetConfig[]
 * (从 DOM 或对象解析)
 */
export function fromCSSGrid(
  gridElement: HTMLElement,
  columns: number
): WidgetConfig[] {
  const widgets: WidgetConfig[] = [];
  const children = gridElement.children;

  for (let i = 0; i < children.length; i++) {
    const el = children[i] as HTMLElement;
    const style = window.getComputedStyle(el);

    const colStart = parseInt(style.gridColumnStart) || 1;
    const colEnd = parseInt(style.gridColumnEnd) || colStart + 1;
    const rowStart = parseInt(style.gridRowStart) || 1;
    const rowEnd = parseInt(style.gridRowEnd) || rowStart + 1;

    widgets.push({
      id: el.dataset.gctId || el.id || uid(),
      rect: placementToRect({ columnStart: colStart, columnEnd: colEnd, rowStart: rowStart, rowEnd: rowEnd }),
      content: el.innerHTML,
      contentType: 'html',
      className: el.className,
      data: Object.fromEntries(
        Object.entries(el.dataset).filter(([k]) => k !== 'gctId')
      ),
    });
  }

  return widgets;
}

/**
 * 生成完整的独立 HTML 页面
 */
export function generateStandaloneHTML(config: GridConfig, title = 'Grid Preview'): string {
  const output = toCSSGrid(config);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    ${output.stylesheet}
  </style>
</head>
<body>
  ${output.html}
</body>
</html>`;
}
