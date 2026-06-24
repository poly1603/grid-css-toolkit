/**
 * 撤销/重做 - 历史记录管理
 */

import type { GridConfig } from '../types';
import { deepClone } from '../core/converter';

interface HistoryEntry {
  config: GridConfig;
  timestamp: number;
}

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxSize: number;
  private onChange?: (canUndo: boolean, canRedo: boolean) => void;

  constructor(maxSize = 50, onChange?: (canUndo: boolean, canRedo: boolean) => void) {
    this.maxSize = maxSize;
    this.onChange = onChange;
  }

  push(config: GridConfig): void {
    this.undoStack.push({
      config: deepClone(config),
      timestamp: Date.now(),
    });
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = []; // 新操作清空重做栈
    this.notify();
  }

  undo(current: GridConfig): GridConfig | null {
    if (this.undoStack.length === 0) return null;
    this.redoStack.push({
      config: deepClone(current),
      timestamp: Date.now(),
    });
    const entry = this.undoStack.pop()!;
    this.notify();
    return entry.config;
  }

  redo(current: GridConfig): GridConfig | null {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push({
      config: deepClone(current),
      timestamp: Date.now(),
    });
    const entry = this.redoStack.pop()!;
    this.notify();
    return entry.config;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  private notify(): void {
    this.onChange?.(this.canUndo(), this.canRedo());
  }
}
