/**
 * 序列化/反序列化 - 布局配置的导入导出
 */

import type { GridConfig, WidgetConfig, ExportOptions } from '../types';
import { deepClone, uid } from './converter';
import { toCSSGrid, generateStandaloneHTML } from './converter';

/**
 * 导出为 JSON 字符串
 */
export function toJSON(config: GridConfig, pretty = true): string {
  return JSON.stringify(config, null, pretty ? 2 : 0);
}

/**
 * 从 JSON 字符串导入
 */
export function fromJSON(json: string): GridConfig {
  const parsed = JSON.parse(json);
  // 兼容旧格式：如果没有 widgets 字段，尝试从 items/layouts 读取
  if (!parsed.widgets && parsed.items) {
    parsed.widgets = parsed.items;
  }
  // 确保每个 widget 有 ID
  if (parsed.widgets) {
    parsed.widgets = parsed.widgets.map((w: WidgetConfig) => ({
      ...w,
      id: w.id || uid(),
    }));
  }
  return parsed;
}

/**
 * 导出为 CSS
 */
export function toCSS(config: GridConfig): string {
  const output = toCSSGrid(config);
  return output.stylesheet;
}

/**
 * 导出为完整 HTML
 */
export function toHTML(config: GridConfig, title?: string): string {
  return generateStandaloneHTML(config, title);
}

/**
 * 导出为 Vue SFC
 */
export function toVue(config: GridConfig, name = 'GridLayout'): string {
  const output = toCSSGrid(config);
  const widgetSlots = config.widgets
    .filter((w) => w.visible !== false)
    .map((w) => {
      const classes = [`gct-grid__${w.id}`, w.className].filter(Boolean).join(' ');
      return `    <div class="${classes}" :key="'${w.id}'">
      <slot name="${w.id}" />
    </div>`;
    })
    .join('\n');

  return `<template>
  <div class="gct-grid">
${widgetSlots}
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: '${name}' });
</script>

<style scoped>
${output.stylesheet}
</style>`;
}

/**
 * 导出为 React 组件
 */
export function toReact(config: GridConfig, name = 'GridLayout'): string {
  const output = toCSSGrid(config);
  const widgetElements = config.widgets
    .filter((w) => w.visible !== false)
    .map((w) => {
      const className = `gct-grid__${w.id}${w.className ? ` ${w.className}` : ''}`;
      return `      <div className="${className}" key="${w.id}">
        {props['${w.id}'] ?? '${w.content ?? ''}'}
      </div>`;
    })
    .join('\n');

  return `import React from 'react';
import './${name}.css';

interface ${name}Props {
  ${config.widgets
    .filter((w) => w.visible !== false)
    .map((w) => `${w.id}?: React.ReactNode;`)
    .join('\n  ')}
}

const ${name}: React.FC<${name}Props> = (props) => {
  return (
    <div className="gct-grid">
${widgetElements}
    </div>
  );
};

export default ${name};`;
}

/**
 * 导出为 Tailwind CSS 类名
 */
export function toTailwind(config: GridConfig): string {
  const cols = config.columns;
  const gap = config.gap;
  const gapMap: Record<number, string> = { 0: '0', 4: '1', 8: '2', 10: '2.5', 12: '3', 16: '4', 20: '5', 24: '6', 32: '8' };
  const gapClass = gapMap[gap] ?? `[${gap}px]`;

  let html = `<div class="grid grid-cols-${cols} gap-${gapClass}">\n`;

  for (const w of config.widgets) {
    if (w.visible === false) continue;
    const colSpan = `col-span-${w.rect.w}`;
    const rowSpan = w.rect.h > 1 ? ` row-span-${w.rect.h}` : '';
    const colStart = w.rect.x > 0 ? ` col-start-${w.rect.x + 1}` : '';
    const rowStart = w.rect.y > 0 ? ` row-start-${w.rect.y + 1}` : '';
    const classes = [colSpan, rowSpan, colStart, rowStart, w.className].filter(Boolean).join(' ');
    html += `  <div class="${classes}">${w.content ?? ''}</div>\n`;
  }

  html += `</div>`;
  return html;
}

/**
 * 导出为 Angular 组件
 */
export function toAngular(config: GridConfig, name = 'GridLayout'): string {
  const output = toCSSGrid(config);
  const selector = name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  const widgetElements = config.widgets
    .filter((w) => w.visible !== false)
    .map((w) => {
      const classes = [`gct-grid__${w.id}`, w.className].filter(Boolean).join(' ');
      return `    <div class="${classes}">
      <ng-content select="[slot-${w.id}]"></ng-content>
    </div>`;
    })
    .join('\n');

  const stylesheetEscaped = output.stylesheet.replace(/`/g, '\\`');

  return `import { Component } from '@angular/core';

@Component({
  selector: 'app-${selector}',
  template: \`
    <div class="gct-grid">
${widgetElements}
    </div>
  \`,
  styles: [\`
    ${stylesheetEscaped}
  \`]
})
export class ${name}Component {}`;
}

/**
 * 导出为 Svelte 组件
 */
export function toSvelte(config: GridConfig, name = 'GridLayout'): string {
  const output = toCSSGrid(config);
  const widgetElements = config.widgets
    .filter((w) => w.visible !== false)
    .map((w) => {
      const classes = [`gct-grid__${w.id}`, w.className].filter(Boolean).join(' ');
      return `  <div class="${classes}">
    <slot name="${w.id}" />
  </div>`;
    })
    .join('\n');

  return `<!-- ${name}.svelte -->
<div class="gct-grid">
${widgetElements}
</div>

<style>
${output.stylesheet}
</style>`;
}

/**
 * 统一导出
 */
export function exportLayout(config: GridConfig, options: ExportOptions): string {
  switch (options.format) {
    case 'json': return toJSON(config, !options.minify);
    case 'css': return toCSS(config);
    case 'html': return toHTML(config);
    case 'vue': return toVue(config);
    case 'react': return toReact(config);
    default: return toJSON(config);
  }
}

/**
 * 从 localStorage 加载
 */
export function loadFromStorage(key = 'gct-layout'): GridConfig | null {
  try {
    const data = localStorage.getItem(key);
    return data ? fromJSON(data) : null;
  } catch {
    return null;
  }
}

/**
 * 保存到 localStorage
 */
export function saveToStorage(config: GridConfig, key = 'gct-layout'): void {
  localStorage.setItem(key, toJSON(config, false));
}

/**
 * 生成预设模板
 */
export const templates = {
  /** 12列标准仪表盘 */
  dashboard(): GridConfig {
    return {
      columns: 12,
      rows: 0,
      cellHeight: 80,
      gap: 10,
      margin: 10,
      staticGrid: false,
      animate: true,
      widgets: [
        { id: uid(), rect: { x: 0, y: 0, w: 8, h: 4 }, content: '主图表', className: 'card chart-main' },
        { id: uid(), rect: { x: 8, y: 0, w: 4, h: 2 }, content: '指标卡 1', className: 'card metric' },
        { id: uid(), rect: { x: 8, y: 2, w: 4, h: 2 }, content: '指标卡 2', className: 'card metric' },
        { id: uid(), rect: { x: 0, y: 4, w: 4, h: 3 }, content: '列表', className: 'card list' },
        { id: uid(), rect: { x: 4, y: 4, w: 4, h: 3 }, content: '统计', className: 'card stats' },
        { id: uid(), rect: { x: 8, y: 4, w: 4, h: 3 }, content: '活动', className: 'card activity' },
      ],
    };
  },

  /** 侧边栏布局 */
  sidebar(): GridConfig {
    return {
      columns: 12,
      rows: 0,
      cellHeight: 60,
      gap: 0,
      margin: 0,
      staticGrid: false,
      animate: true,
      widgets: [
        { id: uid(), rect: { x: 0, y: 0, w: 3, h: 10 }, content: '侧边栏', className: 'sidebar' },
        { id: uid(), rect: { x: 3, y: 0, w: 9, h: 2 }, content: '顶栏', className: 'header' },
        { id: uid(), rect: { x: 3, y: 2, w: 9, h: 8 }, content: '主内容', className: 'main-content' },
      ],
    };
  },

  /** 画廊/网格卡片 */
  gallery(): GridConfig {
    return {
      columns: 4,
      rows: 0,
      cellHeight: 200,
      gap: 16,
      margin: 16,
      staticGrid: false,
      animate: true,
      widgets: Array.from({ length: 8 }, (_, i) => ({
        id: uid(),
        rect: { x: i % 4, y: Math.floor(i / 4), w: 1, h: 1 },
        content: `卡片 ${i + 1}`,
        className: 'gallery-card',
      })),
    };
  },
};
