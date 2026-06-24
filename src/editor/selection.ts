/**
 * 多选管理器 - 支持框选、Ctrl+点击多选、批量操作
 */

import type { WidgetConfig, GridRect } from '../types';

export type SelectionMode = 'single' | 'multi';

export interface SelectionCallbacks {
  onSelect: (ids: string[]) => void;
  onDeselect: () => void;
  onBatchDelete: (ids: string[]) => void;
  onBatchLock: (ids: string[], locked: boolean) => void;
  onBatchMove: (ids: string[], dx: number, dy: number) => void;
}

export class SelectionManager {
  private selectedIds = new Set<string>();
  private container: HTMLElement;
  private callbacks: SelectionCallbacks;
  private boxSelectEl!: HTMLElement;
  private isBoxSelecting = false;
  private boxStart = { x: 0, y: 0 };
  private enabled = true;

  constructor(container: HTMLElement, callbacks: SelectionCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.initBoxSelect();
    this.initKeyboard();
  }

  // ─── 选择操作 ────────────────────────────────────────────

  select(id: string, multi = false): void {
    if (!multi) {
      this.selectedIds.clear();
    }
    this.selectedIds.add(id);
    this.updateHighlight();
    this.callbacks.onSelect(Array.from(this.selectedIds));
  }

  deselect(id?: string): void {
    if (id) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.clear();
    }
    this.updateHighlight();
    if (this.selectedIds.size === 0) {
      this.callbacks.onDeselect();
    } else {
      this.callbacks.onSelect(Array.from(this.selectedIds));
    }
  }

  toggle(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.updateHighlight();
    this.callbacks.onSelect(Array.from(this.selectedIds));
  }

  selectAll(ids: string[]): void {
    this.selectedIds = new Set(ids);
    this.updateHighlight();
    this.callbacks.onSelect(Array.from(this.selectedIds));
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  getSelected(): string[] {
    return Array.from(this.selectedIds);
  }

  getCount(): number {
    return this.selectedIds.size;
  }

  // ─── 框选 ────────────────────────────────────────────────

  private initBoxSelect(): void {
    this.boxSelectEl = document.createElement('div');
    this.boxSelectEl.className = 'gct-box-select';
    this.boxSelectEl.style.cssText = `
      position: absolute;
      border: 1px solid #4f8ff7;
      background: rgba(79, 143, 247, 0.1);
      pointer-events: none;
      z-index: 10000;
      display: none;
    `;
    this.container.style.position = 'relative';
    this.container.appendChild(this.boxSelectEl);

    this.container.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      // 只在空白区域开始框选
      const target = e.target as HTMLElement;
      if (target.closest('.grid-stack-item') || target.closest('.gct-widget')) return;
      if (e.button !== 0 || e.ctrlKey || e.metaKey) return;

      this.isBoxSelecting = true;
      const rect = this.container.getBoundingClientRect();
      this.boxStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.boxSelectEl.style.display = 'block';
      this.boxSelectEl.style.left = `${this.boxStart.x}px`;
      this.boxSelectEl.style.top = `${this.boxStart.y}px`;
      this.boxSelectEl.style.width = '0';
      this.boxSelectEl.style.height = '0';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isBoxSelecting) return;
      const rect = this.container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const left = Math.min(this.boxStart.x, x);
      const top = Math.min(this.boxStart.y, y);
      const width = Math.abs(x - this.boxStart.x);
      const height = Math.abs(y - this.boxStart.y);
      this.boxSelectEl.style.left = `${left}px`;
      this.boxSelectEl.style.top = `${top}px`;
      this.boxSelectEl.style.width = `${width}px`;
      this.boxSelectEl.style.height = `${height}px`;
    });

    document.addEventListener('mouseup', (e) => {
      if (!this.isBoxSelecting) return;
      this.isBoxSelecting = false;
      this.boxSelectEl.style.display = 'none';

      // 检测框选范围内的 widgets
      const boxRect = this.boxSelectEl.getBoundingClientRect();
      if (boxRect.width < 5 && boxRect.height < 5) return; // 太小忽略

      const widgets = this.container.querySelectorAll('[data-gct-id]');
      const selected: string[] = [];
      widgets.forEach((w) => {
        const wRect = w.getBoundingClientRect();
        if (this.rectsOverlap(boxRect, wRect)) {
          const id = (w as HTMLElement).dataset.gctId;
          if (id) selected.push(id);
        }
      });

      if (selected.length > 0) {
        if (e.ctrlKey || e.metaKey) {
          selected.forEach((id) => this.selectedIds.add(id));
        } else {
          this.selectedIds = new Set(selected);
        }
        this.updateHighlight();
        this.callbacks.onSelect(Array.from(this.selectedIds));
      }
    });
  }

  private rectsOverlap(a: DOMRect, b: DOMRect): boolean {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  // ─── 键盘批量操作 ────────────────────────────────────────

  private initKeyboard(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (this.selectedIds.size === 0) return;

      // 忽略输入框
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).contentEditable === 'true') return;

      const ids = Array.from(this.selectedIds);
      const shift = e.shiftKey;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.callbacks.onBatchMove(ids, 0, shift ? -1 : -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.callbacks.onBatchMove(ids, 0, shift ? 1 : 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.callbacks.onBatchMove(ids, shift ? -1 : -1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.callbacks.onBatchMove(ids, shift ? 1 : 1, 0);
          break;
        case 'Delete':
        case 'Backspace':
          if (ids.length > 1) {
            e.preventDefault();
            this.callbacks.onBatchDelete(ids);
          }
          break;
        case 'l':
        case 'L':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.callbacks.onBatchLock(ids, true);
          }
          break;
      }
    });
  }

  // ─── 高亮 ────────────────────────────────────────────────

  private updateHighlight(): void {
    this.container.querySelectorAll('[data-gct-id]').forEach((el) => {
      const id = (el as HTMLElement).dataset.gctId;
      el.classList.toggle('gct-widget--multi-selected', id ? this.selectedIds.has(id) : false);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.selectedIds.clear();
      this.updateHighlight();
    }
  }

  destroy(): void {
    this.boxSelectEl.remove();
    this.selectedIds.clear();
  }
}
