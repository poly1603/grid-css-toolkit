/**
 * 工具栏组件
 */

import type { GridConfig, EditorConfig } from '../types';
import { uid } from '../core/converter';
import { createIcon, createIconWithText } from '../utils/icons';

export interface ToolbarActions {
  addWidget: (w: number, h: number) => void;
  clearAll: () => void;
  save: () => void;
  load: (json: string) => void;
  undo: () => void;
  redo: () => void;
  togglePreview: () => void;
  exportCSS: () => void;
  exportJSON: () => void;
  exportHTML: () => void;
  toggleGridLines: () => void;
  setColumns: (cols: number) => void;
  toggleStatic: () => void;
  duplicate: () => void;
}

export class Toolbar {
  private el: HTMLElement;
  private actions: ToolbarActions;
  private config: EditorConfig;

  constructor(container: HTMLElement, actions: ToolbarActions, config: EditorConfig) {
    this.actions = actions;
    this.config = config;
    this.el = document.createElement('div');
    this.el.className = 'gct-toolbar';
    this.render();
    container.prepend(this.el);
  }

  private render(): void {
    this.el.innerHTML = `
      <div class="gct-toolbar__group">
        <button class="gct-toolbar__btn gct-toolbar__btn--primary" data-action="add" title="添加 Widget (A)">
          ${createIconWithText('plus', '添加')}
        </button>
        <select class="gct-toolbar__select" data-action="addSize">
          <option value="1,1">1×1</option>
          <option value="2,1">2×1</option>
          <option value="1,2">1×2</option>
          <option value="2,2" selected>2×2</option>
          <option value="3,2">3×2</option>
          <option value="4,2">4×2</option>
          <option value="3,3">3×3</option>
          <option value="4,3">4×3</option>
          <option value="6,4">6×4</option>
        </select>
      </div>

      <div class="gct-toolbar__separator"></div>

      <div class="gct-toolbar__group">
        <button class="gct-toolbar__btn" data-action="undo" title="撤销 (Ctrl+Z)">
          ${createIcon('undo')}
        </button>
        <button class="gct-toolbar__btn" data-action="redo" title="重做 (Ctrl+Y)">
          ${createIcon('redo')}
        </button>
      </div>

      <div class="gct-toolbar__separator"></div>

      <div class="gct-toolbar__group">
        <label class="gct-toolbar__label">列数</label>
        <select class="gct-toolbar__select" data-action="columns">
          ${[2, 3, 4, 6, 8, 12, 16, 24].map((c) => `<option value="${c}" ${c === 12 ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <button class="gct-toolbar__btn" data-action="static" title="切换静态/可编辑">
          ${createIcon('lock')}
        </button>
        <button class="gct-toolbar__btn" data-action="gridLines" title="网格线">
          ${createIcon('grid-3x3')}
        </button>
      </div>

      <div class="gct-toolbar__spacer"></div>

      <div class="gct-toolbar__group">
        <button class="gct-toolbar__btn" data-action="preview" title="预览 (P)">
          ${createIconWithText('eye', '预览')}
        </button>
        <button class="gct-toolbar__btn" data-action="exportCSS" title="导出 CSS">
          ${createIcon('file-text')}
        </button>
        <button class="gct-toolbar__btn" data-action="exportJSON" title="导出 JSON">
          ${createIcon('file')}
        </button>
        <button class="gct-toolbar__btn" data-action="exportHTML" title="导出 HTML">
          ${createIcon('code')}
        </button>
        <button class="gct-toolbar__btn gct-toolbar__btn--save" data-action="save" title="保存 (Ctrl+S)">
          ${createIconWithText('save', '保存')}
        </button>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.el.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
      if (!btn) return;
      const action = btn.dataset.action;

      switch (action) {
        case 'add': {
          const sizeSelect = this.el.querySelector('[data-action="addSize"]') as HTMLSelectElement;
          const [w, h] = sizeSelect.value.split(',').map(Number);
          this.actions.addWidget(w, h);
          break;
        }
        case 'undo': this.actions.undo(); break;
        case 'redo': this.actions.redo(); break;
        case 'static': this.actions.toggleStatic(); break;
        case 'gridLines': this.actions.toggleGridLines(); break;
        case 'preview': this.actions.togglePreview(); break;
        case 'exportCSS': this.actions.exportCSS(); break;
        case 'exportJSON': this.actions.exportJSON(); break;
        case 'exportHTML': this.actions.exportHTML(); break;
        case 'save': this.actions.save(); break;
        case 'clear':
          if (confirm('确定清空所有 Widget？')) this.actions.clearAll();
          break;
      }
    });

    // 列数选择
    const colSelect = this.el.querySelector('[data-action="columns"]') as HTMLSelectElement;
    colSelect?.addEventListener('change', () => {
      this.actions.setColumns(Number(colSelect.value));
    });
  }

  setColumns(cols: number): void {
    const sel = this.el.querySelector('[data-action="columns"]') as HTMLSelectElement;
    if (sel) sel.value = String(cols);
  }

  setStatic(isStatic: boolean): void {
    const btn = this.el.querySelector('[data-action="static"]');
    if (btn) {
      btn.innerHTML = isStatic ? createIcon('unlock') : createIcon('lock');
    }
  }

  destroy(): void {
    this.el.remove();
  }
}
