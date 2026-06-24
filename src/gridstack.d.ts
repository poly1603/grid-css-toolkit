/**
 * GridStack.js 类型声明
 */

declare module 'gridstack' {
  export interface GridStackWidget {
    id?: string | number;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    autoPosition?: boolean;
    noMove?: boolean;
    noResize?: boolean;
    locked?: boolean;
    content?: string;
    el?: HTMLElement;
    [key: string]: any;
  }

  export interface GridStackOptions {
    column?: number;
    columns?: number;
    cellHeight?: number;
    margin?: number;
    animate?: boolean;
    staticGrid?: boolean;
    acceptWidgets?: boolean;
    maxRow?: number;
    float?: boolean;
    removable?: boolean;
    removeTimeout?: number;
    disableOneColumnMode?: boolean;
    dragHandle?: string;
    itemClass?: string;
    [key: string]: any;
  }

  export class GridStack {
    static init(options?: GridStackOptions, el?: HTMLElement | string): GridStack;

    on(event: string, callback: (event: Event, el: GridStackWidget | GridStackWidget[]) => void): void;
    off(event: string): void;

    addWidget(widget: GridStackWidget | string): HTMLElement;
    removeWidget(el: HTMLElement | string, removeDOM?: boolean, triggerEvent?: boolean): GridStackWidget;
    removeAll(removeDOM?: boolean): void;

    update(el: HTMLElement | string, options: GridStackWidget): GridStack;

    column(column: number, mode?: 'moveScale' | 'move' | 'scale' | 'none' | 'compact'): void;
    cellHeight(val: number): void;
    setStatic(staticGrid: boolean): void;

    destroy(): void;

    getGridItems(): HTMLElement[];
    makeWidget(el: HTMLElement): GridStackWidget;
  }
}
