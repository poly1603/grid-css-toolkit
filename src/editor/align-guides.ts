/**
 * 对齐辅助线 - 拖拽时显示智能辅助线
 */

import type { GridRect, WidgetConfig } from '../types';

export interface GuideLine {
  type: 'horizontal' | 'vertical';
  position: number; // px
  source: string;   // widget id or 'edge'
  target: string;
}

export class AlignGuides {
  private container: HTMLElement;
  private canvasEl!: HTMLElement;
  private guidelines: GuideLine[] = [];
  private snapThreshold = 5; // px
  private enabled = true;
  private snapEnabled = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvasEl = document.createElement('div');
    this.canvasEl.className = 'gct-align-guides';
    this.canvasEl.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    `;
    container.style.position = 'relative';
    container.appendChild(this.canvasEl);
  }

  /** 计算辅助线 */
  calculate(
    draggingRect: GridRect,
    allWidgets: WidgetConfig[],
    cellWidth: number,
    cellHeight: number,
    gap: number,
    columns: number
  ): { guides: GuideLine[]; snappedX: number; snappedY: number } {
    if (!this.enabled) return { guides: [], snappedX: draggingRect.x, snappedY: draggingRect.y };

    const guides: GuideLine[] = [];
    let snappedX = draggingRect.x;
    let snappedY = draggingRect.y;

    const dragLeft = draggingRect.x * (cellWidth + gap);
    const dragRight = dragLeft + draggingRect.w * cellWidth + (draggingRect.w - 1) * gap;
    const dragTop = draggingRect.y * (cellHeight + gap);
    const dragBottom = dragTop + draggingRect.h * cellHeight + (draggingRect.h - 1) * gap;
    const dragCenterX = (dragLeft + dragRight) / 2;
    const dragCenterY = (dragTop + dragBottom) / 2;

    // 网格边缘
    const gridRight = columns * (cellWidth + gap) - gap;

    // 边缘对齐
    if (Math.abs(dragLeft) < this.snapThreshold) {
      guides.push({ type: 'vertical', position: 0, source: 'drag', target: 'edge-left' });
      snappedX = 0;
    }
    if (Math.abs(dragRight - gridRight) < this.snapThreshold) {
      guides.push({ type: 'vertical', position: gridRight, source: 'drag', target: 'edge-right' });
      snappedX = columns - draggingRect.w;
    }

    // 与其他 widget 对齐
    for (const w of allWidgets) {
      if (w.rect.x === draggingRect.x && w.rect.y === draggingRect.y) continue;

      const wLeft = w.rect.x * (cellWidth + gap);
      const wRight = wLeft + w.rect.w * cellWidth + (w.rect.w - 1) * gap;
      const wTop = w.rect.y * (cellHeight + gap);
      const wBottom = wTop + w.rect.h * cellHeight + (w.rect.h - 1) * gap;
      const wCenterX = (wLeft + wRight) / 2;
      const wCenterY = (wTop + wBottom) / 2;

      // 左对齐
      if (Math.abs(dragLeft - wLeft) < this.snapThreshold) {
        guides.push({ type: 'vertical', position: wLeft, source: 'drag', target: w.id });
        if (this.snapEnabled) snappedX = w.rect.x;
      }
      // 右对齐
      if (Math.abs(dragRight - wRight) < this.snapThreshold) {
        guides.push({ type: 'vertical', position: wRight, source: 'drag', target: w.id });
        if (this.snapEnabled) snappedX = w.rect.x + w.rect.w - draggingRect.w;
      }
      // 中心 X 对齐
      if (Math.abs(dragCenterX - wCenterX) < this.snapThreshold) {
        guides.push({ type: 'vertical', position: wCenterX, source: 'drag', target: w.id });
        if (this.snapEnabled) snappedX = Math.round((wCenterX - (dragRight - dragLeft) / 2) / (cellWidth + gap));
      }
      // 左对右
      if (Math.abs(dragLeft - wRight) < this.snapThreshold) {
        guides.push({ type: 'vertical', position: wRight, source: 'drag', target: w.id });
        if (this.snapEnabled) snappedX = w.rect.x + w.rect.w;
      }
      // 右对左
      if (Math.abs(dragRight - wLeft) < this.snapThreshold) {
        guides.push({ type: 'vertical', position: wLeft, source: 'drag', target: w.id });
        if (this.snapEnabled) snappedX = w.rect.x - draggingRect.w;
      }

      // 顶对齐
      if (Math.abs(dragTop - wTop) < this.snapThreshold) {
        guides.push({ type: 'horizontal', position: wTop, source: 'drag', target: w.id });
        if (this.snapEnabled) snappedY = w.rect.y;
      }
      // 底对齐
      if (Math.abs(dragBottom - wBottom) < this.snapThreshold) {
        guides.push({ type: 'horizontal', position: wBottom, source: 'drag', target: w.id });
        if (this.snapEnabled) snappedY = w.rect.y + w.rect.h - draggingRect.h;
      }
      // 中心 Y 对齐
      if (Math.abs(dragCenterY - wCenterY) < this.snapThreshold) {
        guides.push({ type: 'horizontal', position: wCenterY, source: 'drag', target: w.id });
        if (this.snapEnabled) snappedY = Math.round((wCenterY - (dragBottom - dragTop) / 2) / (cellHeight + gap));
      }
      // 顶对底
      if (Math.abs(dragTop - wBottom) < this.snapThreshold) {
        guides.push({ type: 'horizontal', position: wBottom, source: 'drag', target: w.id });
        if (this.snapEnabled) snappedY = w.rect.y + w.rect.h;
      }
      // 底对顶
      if (Math.abs(dragBottom - wTop) < this.snapThreshold) {
        guides.push({ type: 'horizontal', position: wTop, source: 'drag', target: w.id });
        if (this.snapEnabled) snappedY = w.rect.y - draggingRect.h;
      }
    }

    // 去重
    const unique = new Map<string, GuideLine>();
    for (const g of guides) {
      const key = `${g.type}-${Math.round(g.position)}`;
      if (!unique.has(key)) unique.set(key, g);
    }

    this.guidelines = Array.from(unique.values());
    return { guides: this.guidelines, snappedX, snappedY };
  }

  /** 渲染辅助线 */
  render(): void {
    this.canvasEl.innerHTML = '';
    for (const guide of this.guidelines) {
      const line = document.createElement('div');
      line.className = `gct-guide gct-guide--${guide.type}`;
      if (guide.type === 'vertical') {
        line.style.cssText = `
          position: absolute;
          left: ${guide.position}px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: #4f8ff7;
          box-shadow: 0 0 4px rgba(79, 143, 247, 0.5);
          z-index: 9999;
        `;
      } else {
        line.style.cssText = `
          position: absolute;
          top: ${guide.position}px;
          left: 0;
          right: 0;
          height: 1px;
          background: #4f8ff7;
          box-shadow: 0 0 4px rgba(79, 143, 247, 0.5);
          z-index: 9999;
        `;
      }
      this.canvasEl.appendChild(line);
    }
  }

  clear(): void {
    this.guidelines = [];
    this.canvasEl.innerHTML = '';
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }

  setSnapEnabled(enabled: boolean): void {
    this.snapEnabled = enabled;
  }

  setThreshold(px: number): void {
    this.snapThreshold = px;
  }

  destroy(): void {
    this.canvasEl.remove();
  }
}
