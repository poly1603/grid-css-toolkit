/**
 * 事件系统 - 类型安全的发布/订阅
 */

import type { GridEventMap, EventHandler } from '../types';

export class EventBus {
  private handlers = new Map<string, Set<Function>>();

  on<K extends keyof GridEventMap>(event: K, handler: EventHandler<GridEventMap[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    // 返回 unsubscribe
    return () => this.off(event, handler);
  }

  off<K extends keyof GridEventMap>(event: K, handler: EventHandler<GridEventMap[K]>): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<K extends keyof GridEventMap>(event: K, data: GridEventMap[K]): void {
    this.handlers.get(event)?.forEach((fn) => {
      try {
        fn(data);
      } catch (e) {
        console.error(`[GridCssToolkit] Event handler error for "${event}":`, e);
      }
    });
  }

  once<K extends keyof GridEventMap>(event: K, handler: EventHandler<GridEventMap[K]>): () => void {
    const wrapped: EventHandler<GridEventMap[K]> = (data) => {
      handler(data);
      this.off(event, wrapped);
    };
    return this.on(event, wrapped);
  }

  clear(): void {
    this.handlers.clear();
  }
}
