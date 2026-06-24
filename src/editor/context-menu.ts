/**
 * 右键上下文菜单
 */

import { createIcon } from '../utils/icons';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  children?: ContextMenuItem[];
  action?: () => void;
}

export class ContextMenu {
  private el: HTMLElement;
  private visible = false;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'gct-context-menu';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    // 点击其他地方关闭
    document.addEventListener('click', () => this.hide());
    document.addEventListener('contextmenu', (e) => {
      // 如果不是在我们的目标区域，关闭
      if (!this.el.contains(e.target as Node)) {
        this.hide();
      }
    });
  }

  show(x: number, y: number, items: ContextMenuItem[]): void {
    this.el.innerHTML = this.renderItems(items);
    this.bindActions(items);

    // 定位
    this.el.style.display = 'block';
    this.visible = true;

    // 边界修正
    const rect = this.el.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    this.el.style.left = `${Math.min(x, maxX)}px`;
    this.el.style.top = `${Math.min(y, maxY)}px`;

    // 动画
    requestAnimationFrame(() => {
      this.el.classList.add('gct-context-menu--visible');
    });
  }

  hide(): void {
    if (!this.visible) return;
    this.el.classList.remove('gct-context-menu--visible');
    setTimeout(() => {
      this.el.style.display = 'none';
      this.visible = false;
    }, 150);
  }

  private renderItems(items: ContextMenuItem[]): string {
    return items.map((item) => {
      if (item.divider) return '<div class="gct-ctx__divider"></div>';

      const hasChildren = item.children && item.children.length > 0;
      return `
        <div class="gct-ctx__item ${item.disabled ? 'gct-ctx__item--disabled' : ''} ${hasChildren ? 'gct-ctx__item--has-children' : ''}"
             data-ctx-id="${item.id}">
          <span class="gct-ctx__icon">${item.icon ? createIcon(item.icon, 14) : ''}</span>
          <span class="gct-ctx__label">${item.label}</span>
          ${item.shortcut ? `<span class="gct-ctx__shortcut">${item.shortcut}</span>` : ''}
          ${hasChildren ? `<span class="gct-ctx__arrow">${createIcon('chevron-right', 12)}</span>` : ''}
          ${hasChildren ? `<div class="gct-ctx__submenu">${this.renderItems(item.children!)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  private bindActions(items: ContextMenuItem[]): void {
    const flatItems = this.flattenItems(items);
    this.el.querySelectorAll('.gct-ctx__item').forEach((el) => {
      const id = (el as HTMLElement).dataset.ctxId;
      const item = flatItems.find((i) => i.id === id);
      if (!item || item.disabled || !item.action) return;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        item.action!();
        this.hide();
      });
    });
  }

  private flattenItems(items: ContextMenuItem[]): ContextMenuItem[] {
    const result: ContextMenuItem[] = [];
    for (const item of items) {
      result.push(item);
      if (item.children) result.push(...this.flattenItems(item.children));
    }
    return result;
  }

  destroy(): void {
    this.el.remove();
  }
}

// ─── 预设菜单模板 ──────────────────────────────────────────

export function createWidgetContextMenu(actions: {
  edit?: () => void;
  duplicate?: () => void;
  copy?: () => void;
  lock?: () => void;
  unlock?: () => void;
  isLocked?: boolean;
  hide?: () => void;
  bringToFront?: () => void;
  sendToBack?: () => void;
  delete?: () => void;
  saveAsTemplate?: () => void;
}): ContextMenuItem[] {
  return [
    { id: 'edit', label: '编辑内容', icon: 'edit', shortcut: 'Enter', action: actions.edit },
    { id: 'duplicate', label: '复制', icon: 'copy', shortcut: 'D', action: actions.duplicate },
    { id: 'copy', label: '拷贝配置', icon: 'clipboard', shortcut: 'Ctrl+C', action: actions.copy },
    { id: 'divider1', label: '', divider: true },
    {
      id: actions.isLocked ? 'unlock' : 'lock',
      label: actions.isLocked ? '解锁' : '锁定',
      icon: actions.isLocked ? 'unlock' : 'lock',
      shortcut: 'L',
      action: actions.isLocked ? actions.unlock : actions.lock,
    },
    { id: 'hide', label: '隐藏', icon: 'eye-off', action: actions.hide },
    { id: 'divider2', label: '', divider: true },
    { id: 'front', label: '移到最前', icon: 'arrow-up-to-line', action: actions.bringToFront },
    { id: 'back', label: '移到最后', icon: 'arrow-down-to-line', action: actions.sendToBack },
    { id: 'divider3', label: '', divider: true },
    { id: 'saveTpl', label: '保存为模板', icon: 'save', action: actions.saveAsTemplate },
    { id: 'divider4', label: '', divider: true },
    { id: 'delete', label: '删除', icon: 'trash-2', shortcut: 'Del', action: actions.delete },
  ];
}

export function createGridContextMenu(actions: {
  addWidget?: () => void;
  paste?: () => void;
  selectAll?: () => void;
  clearAll?: () => void;
  toggleGridLines?: () => void;
  toggleSnap?: () => void;
  resetLayout?: () => void;
}): ContextMenuItem[] {
  return [
    { id: 'add', label: '添加 Widget', icon: 'plus', shortcut: 'A', action: actions.addWidget },
    { id: 'paste', label: '粘贴', icon: 'clipboard', shortcut: 'Ctrl+V', action: actions.paste },
    { id: 'divider1', label: '', divider: true },
    { id: 'selectAll', label: '全选', icon: 'check', shortcut: 'Ctrl+A', action: actions.selectAll },
    { id: 'divider2', label: '', divider: true },
    { id: 'gridLines', label: '网格线', icon: 'grid-3x3', action: actions.toggleGridLines },
    { id: 'snap', label: '吸附对齐', icon: 'magnet', action: actions.toggleSnap },
    { id: 'divider3', label: '', divider: true },
    { id: 'reset', label: '重置布局', icon: 'refresh-cw', action: actions.resetLayout },
    { id: 'clear', label: '清空所有', icon: 'trash-2', action: actions.clearAll },
  ];
}
