/**
 * 属性面板 - 编辑选中 Widget 的属性
 */

import type { WidgetConfig, GridConfig } from '../types';
import { uid } from '../core/converter';
import { createIcon } from '../utils/icons';

export interface PropertyPanelCallbacks {
  onUpdate: (id: string, changes: Partial<WidgetConfig>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onLock: (id: string, locked: boolean) => void;
  onVisibility: (id: string, visible: boolean) => void;
}

export class PropertyPanel {
  private el: HTMLElement;
  private callbacks: PropertyPanelCallbacks;
  private currentWidget: WidgetConfig | null = null;
  private columns = 12;

  constructor(container: HTMLElement, callbacks: PropertyPanelCallbacks) {
    this.callbacks = callbacks;
    this.el = document.createElement('div');
    this.el.className = 'gct-property-panel';
    this.el.innerHTML = '<div class="gct-property-panel__empty">选择一个 Widget 查看属性</div>';
    container.appendChild(this.el);
  }

  select(widget: WidgetConfig | null, columns: number): void {
    this.currentWidget = widget;
    this.columns = columns;
    this.render();
  }

  private render(): void {
    const w = this.currentWidget;
    if (!w) {
      this.el.innerHTML = '<div class="gct-property-panel__empty">选择一个 Widget 查看属性</div>';
      return;
    }

    this.el.innerHTML = `
      <div class="gct-property-panel__header">
        <h3>Widget 属性</h3>
        <div class="gct-property-panel__actions">
          <button class="gct-btn-icon" data-act="duplicate" title="复制">${createIcon('copy', 14)}</button>
          <button class="gct-btn-icon" data-act="lock" title="${w.locked ? '解锁' : '锁定'}">${createIcon(w.locked ? 'unlock' : 'lock', 14)}</button>
          <button class="gct-btn-icon" data-act="visibility" title="${w.visible === false ? '显示' : '隐藏'}">${createIcon(w.visible === false ? 'eye' : 'eye-off', 14)}</button>
          <button class="gct-btn-icon gct-btn-icon--danger" data-act="delete" title="删除">${createIcon('trash-2', 14)}</button>
        </div>
      </div>

      <div class="gct-property-panel__body">
        <div class="gct-field">
          <label>ID</label>
          <input type="text" value="${w.id}" disabled class="gct-input gct-input--disabled" />
        </div>

        <div class="gct-field-row">
          <div class="gct-field">
            <label>X</label>
            <input type="number" value="${w.rect.x}" min="0" max="${this.columns - 1}" data-prop="x" class="gct-input" />
          </div>
          <div class="gct-field">
            <label>Y</label>
            <input type="number" value="${w.rect.y}" min="0" data-prop="y" class="gct-input" />
          </div>
          <div class="gct-field">
            <label>W</label>
            <input type="number" value="${w.rect.w}" min="${w.minW ?? 1}" max="${w.maxW ?? this.columns}" data-prop="w" class="gct-input" />
          </div>
          <div class="gct-field">
            <label>H</label>
            <input type="number" value="${w.rect.h}" min="${w.minH ?? 1}" max="${w.maxH ?? 999}" data-prop="h" class="gct-input" />
          </div>
        </div>

        <div class="gct-field-row">
          <div class="gct-field">
            <label>最小 W</label>
            <input type="number" value="${w.minW ?? ''}" min="1" data-prop="minW" class="gct-input" placeholder="无" />
          </div>
          <div class="gct-field">
            <label>最小 H</label>
            <input type="number" value="${w.minH ?? ''}" min="1" data-prop="minH" class="gct-input" placeholder="无" />
          </div>
          <div class="gct-field">
            <label>最大 W</label>
            <input type="number" value="${w.maxW ?? ''}" min="1" data-prop="maxW" class="gct-input" placeholder="无" />
          </div>
          <div class="gct-field">
            <label>最大 H</label>
            <input type="number" value="${w.maxH ?? ''}" min="1" data-prop="maxH" class="gct-input" placeholder="无" />
          </div>
        </div>

        <div class="gct-field">
          <label>类名</label>
          <input type="text" value="${w.className ?? ''}" data-prop="className" class="gct-input" placeholder="空格分隔" />
        </div>

        <div class="gct-field">
          <label>内容类型</label>
          <select data-prop="contentType" class="gct-input">
            <option value="text" ${w.contentType === 'text' ? 'selected' : ''}>文本</option>
            <option value="html" ${w.contentType === 'html' ? 'selected' : ''}>HTML</option>
            <option value="component" ${w.contentType === 'component' ? 'selected' : ''}>组件</option>
            <option value="slot" ${w.contentType === 'slot' ? 'selected' : ''}>Slot</option>
          </select>
        </div>

        <div class="gct-field">
          <label>内容</label>
          <textarea data-prop="content" class="gct-input gct-textarea" rows="3">${w.content ?? ''}</textarea>
        </div>

        <div class="gct-field">
          <label>Z-Index</label>
          <input type="number" value="${w.zIndex ?? ''}" data-prop="zIndex" class="gct-input" placeholder="自动" />
        </div>

        <div class="gct-field">
          <label>自定义数据 (JSON)</label>
          <textarea data-prop="data" class="gct-input gct-textarea" rows="2" placeholder='{"key": "value"}'>${w.data ? JSON.stringify(w.data, null, 2) : ''}</textarea>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // 动作按钮
    this.el.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = (btn as HTMLElement).dataset.act;
        const w = this.currentWidget;
        if (!w) return;
        switch (act) {
          case 'delete': this.callbacks.onDelete(w.id); break;
          case 'duplicate': this.callbacks.onDuplicate(w.id); break;
          case 'lock': this.callbacks.onLock(w.id, !w.locked); break;
          case 'visibility': this.callbacks.onVisibility(w.id, w.visible !== false ? false : true); break;
        }
      });
    });

    // 属性输入
    this.el.querySelectorAll('[data-prop]').forEach((input) => {
      const el = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const prop = el.dataset.prop!;

      const handler = () => {
        if (!this.currentWidget) return;
        let value: any = el.value;

        // 数字字段
        if (['x', 'y', 'w', 'h', 'minW', 'minH', 'maxW', 'maxH', 'zIndex'].includes(prop)) {
          value = value === '' ? undefined : Number(value);
          if (value !== undefined && isNaN(value)) return;
        }

        // data 字段
        if (prop === 'data') {
          try {
            value = value.trim() ? JSON.parse(value) : undefined;
          } catch {
            return; // JSON 无效，不更新
          }
        }

        const changes: any = {};
        if (['x', 'y', 'w', 'h'].includes(prop)) {
          changes.rect = { ...this.currentWidget.rect, [prop]: value };
        } else {
          changes[prop] = value;
        }

        this.callbacks.onUpdate(this.currentWidget!.id, changes);
      };

      el.addEventListener('change', handler);
      if (el.tagName === 'TEXTAREA') {
        el.addEventListener('input', handler);
      }
    });
  }

  destroy(): void {
    this.el.remove();
  }
}
