/**
 * 布局快照/版本管理 - 保存、恢复、比较不同版本的布局
 */

import type { GridConfig } from '../types';
import { deepClone, uid } from '../core/converter';
import { createIcon } from '../utils/icons';

export interface Snapshot {
  id: string;
  name: string;
  config: GridConfig;
  timestamp: number;
  description?: string;
  tags?: string[];
  thumbnail?: string; // base64 缩略图
}

export interface SnapshotDiff {
  added: string[];
  removed: string[];
  moved: Array<{ id: string; from: { x: number; y: number }; to: { x: number; y: number } }>;
  resized: Array<{ id: string; from: { w: number; h: number }; to: { w: number; h: number } }>;
  contentChanged: string[];
}

export class SnapshotManager {
  private snapshots: Snapshot[] = [];
  private maxSize: number;
  private storageKey: string;
  private onChange?: (snapshots: Snapshot[]) => void;

  constructor(maxSize = 20, storageKey = 'gct-snapshots', onChange?: (snapshots: Snapshot[]) => void) {
    this.maxSize = maxSize;
    this.storageKey = storageKey;
    this.onChange = onChange;
    this.load();
  }

  /** 保存快照 */
  save(config: GridConfig, name?: string, description?: string, tags?: string[]): Snapshot {
    const snapshot: Snapshot = {
      id: uid(),
      name: name ?? `快照 ${this.snapshots.length + 1}`,
      config: deepClone(config),
      timestamp: Date.now(),
      description,
      tags,
    };

    this.snapshots.unshift(snapshot);
    if (this.snapshots.length > this.maxSize) {
      this.snapshots = this.snapshots.slice(0, this.maxSize);
    }

    this.persist();
    this.onChange?.(this.snapshots);
    return snapshot;
  }

  /** 恢复快照 */
  restore(id: string): GridConfig | null {
    const snapshot = this.snapshots.find((s) => s.id === id);
    return snapshot ? deepClone(snapshot.config) : null;
  }

  /** 删除快照 */
  delete(id: string): void {
    this.snapshots = this.snapshots.filter((s) => s.id !== id);
    this.persist();
    this.onChange?.(this.snapshots);
  }

  /** 重命名 */
  rename(id: string, name: string): void {
    const snapshot = this.snapshots.find((s) => s.id === id);
    if (snapshot) {
      snapshot.name = name;
      this.persist();
      this.onChange?.(this.snapshots);
    }
  }

  /** 获取所有快照 */
  getAll(): Snapshot[] {
    return [...this.snapshots];
  }

  /** 比较两个快照的差异 */
  diff(idA: string, idB: string): SnapshotDiff | null {
    const a = this.snapshots.find((s) => s.id === idA);
    const b = this.snapshots.find((s) => s.id === idB);
    if (!a || !b) return null;
    return this.compareConfigs(a.config, b.config);
  }

  /** 与当前快照比较 */
  diffWithCurrent(snapshotId: string, currentConfig: GridConfig): SnapshotDiff | null {
    const snapshot = this.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) return null;
    return this.compareConfigs(snapshot.config, currentConfig);
  }

  private compareConfigs(a: GridConfig, b: GridConfig): SnapshotDiff {
    const aIds = new Set(a.widgets.map((w) => w.id));
    const bIds = new Set(b.widgets.map((w) => w.id));

    const added = b.widgets.filter((w) => !aIds.has(w.id)).map((w) => w.id);
    const removed = a.widgets.filter((w) => !bIds.has(w.id)).map((w) => w.id);

    const moved: SnapshotDiff['moved'] = [];
    const resized: SnapshotDiff['resized'] = [];
    const contentChanged: string[] = [];

    for (const bw of b.widgets) {
      const aw = a.widgets.find((w) => w.id === bw.id);
      if (!aw) continue;

      if (aw.rect.x !== bw.rect.x || aw.rect.y !== bw.rect.y) {
        moved.push({ id: bw.id, from: { x: aw.rect.x, y: aw.rect.y }, to: { x: bw.rect.x, y: bw.rect.y } });
      }
      if (aw.rect.w !== bw.rect.w || aw.rect.h !== bw.rect.h) {
        resized.push({ id: bw.id, from: { w: aw.rect.w, h: aw.rect.h }, to: { w: bw.rect.w, h: bw.rect.h } });
      }
      if (aw.content !== bw.content) {
        contentChanged.push(bw.id);
      }
    }

    return { added, removed, moved, resized, contentChanged };
  }

  /** 导出所有快照 */
  exportAll(): string {
    return JSON.stringify(this.snapshots, null, 2);
  }

  /** 导入快照 */
  importAll(json: string): void {
    const imported: Snapshot[] = JSON.parse(json);
    this.snapshots = [...imported, ...this.snapshots].slice(0, this.maxSize);
    this.persist();
    this.onChange?.(this.snapshots);
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) this.snapshots = JSON.parse(raw);
    } catch { /* ignore */ }
  }

  private persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.snapshots));
  }

  /** 渲染快照列表 UI */
  renderPanel(onRestore: (config: GridConfig) => void): HTMLElement {
    const el = document.createElement('div');
    el.className = 'gct-snapshots';

    const renderList = () => {
      el.innerHTML = `
        <div class="gct-snapshots__header">
          <h3>${createIcon('camera', 18)} 布局快照</h3>
          <button class="gct-btn-sm" data-act="save">${createIcon('save', 14)} 保存当前</button>
        </div>
        <div class="gct-snapshots__list">
          ${this.snapshots.length === 0 ? '<div class="gct-snapshots__empty">暂无快照</div>' : ''}
          ${this.snapshots
            .map(
              (s) => `
            <div class="gct-snapshot" data-id="${s.id}">
              <div class="gct-snapshot__info">
                <span class="gct-snapshot__name">${s.name}</span>
                <span class="gct-snapshot__time">${new Date(s.timestamp).toLocaleString()}</span>
                <span class="gct-snapshot__meta">${s.config.widgets.length} widgets · ${s.config.columns} cols</span>
              </div>
              <div class="gct-snapshot__actions">
                <button class="gct-btn-xs" data-act="restore" data-id="${s.id}" title="恢复">${createIcon('rotate-ccw', 12)}</button>
                <button class="gct-btn-xs" data-act="rename" data-id="${s.id}" title="重命名">${createIcon('edit', 12)}</button>
                <button class="gct-btn-xs gct-btn-xs--danger" data-act="delete" data-id="${s.id}" title="删除">${createIcon('trash-2', 12)}</button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      // 绑定事件
      el.querySelector('[data-act="save"]')?.addEventListener('click', () => {
        const name = prompt('快照名称:', `快照 ${this.snapshots.length + 1}`);
        if (name) {
          this.save(onRestore(null as any) as any, name); // 传入当前 config 需要外部处理
        }
      });

      el.querySelectorAll('[data-act="restore"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = (btn as HTMLElement).dataset.id!;
          const config = this.restore(id);
          if (config) onRestore(config);
        });
      });

      el.querySelectorAll('[data-act="rename"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = (btn as HTMLElement).dataset.id!;
          const name = prompt('新名称:');
          if (name) this.rename(id, name);
        });
      });

      el.querySelectorAll('[data-act="delete"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = (btn as HTMLElement).dataset.id!;
          if (confirm('确定删除此快照？')) this.delete(id);
        });
      });
    };

    renderList();
    this.onChange = () => renderList();

    return el;
  }

  destroy(): void {
    this.onChange = undefined;
  }
}
