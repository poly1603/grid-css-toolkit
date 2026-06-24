/**
 * 动态属性面板渲染器 - 根据物料 Schema 自动生成属性编辑器
 *
 * 功能：
 * - 根据 PropSchema 动态生成表单控件
 * - 分组折叠显示
 * - 条件显隐
 * - 属性联动
 * - 样式编辑器
 * - 事件绑定面板
 * - 动画配置面板
 * - 数据源绑定面板
 */

import type { PropSchema } from './component-registry';
import type { MaterialDefinition } from './material';
import type { AnimationPreset } from './animation';

// ─── 属性面板 Tab ──────────────────────────────────────────

export type PanelTab = 'props' | 'style' | 'events' | 'animation' | 'data' | 'advanced';

export interface PanelTabConfig {
  id: PanelTab;
  label: string;
  icon: string;
  visible: boolean;
}

// ─── 属性面板渲染器 ────────────────────────────────────────

export class PropPanelRenderer {
  private container: HTMLElement;
  private currentMaterial: MaterialDefinition | null = null;
  private currentProps: Record<string, unknown> = {};
  private currentStyle: Record<string, string> = {};
  private currentEvents: Record<string, unknown[]> = {};
  private activeTab: PanelTab = 'props';
  private onChange?: (props: Record<string, unknown>) => void;
  private onStyleChange?: (style: Record<string, string>) => void;
  private onEventChange?: (events: Record<string, unknown[]>) => void;
  private tabs: PanelTabConfig[] = [
    { id: 'props', label: '属性', icon: '⚙', visible: true },
    { id: 'style', label: '样式', icon: '🎨', visible: true },
    { id: 'events', label: '事件', icon: '⚡', visible: true },
    { id: 'animation', label: '动画', icon: '✨', visible: true },
    { id: 'data', label: '数据', icon: '📊', visible: true },
    { id: 'advanced', label: '高级', icon: '🔧', visible: true },
  ];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  // ─── 设置监听 ────────────────────────────────────────────

  setOnChange(fn: (props: Record<string, unknown>) => void): void {
    this.onChange = fn;
  }

  setOnStyleChange(fn: (style: Record<string, string>) => void): void {
    this.onStyleChange = fn;
  }

  setOnEventChange(fn: (events: Record<string, unknown[]>) => void): void {
    this.onEventChange = fn;
  }

  // ─── 渲染入口 ────────────────────────────────────────────

  render(material: MaterialDefinition | null, props?: Record<string, unknown>, style?: Record<string, string>, events?: Record<string, unknown[]>): void {
    this.currentMaterial = material;
    this.currentProps = props ?? {};
    this.currentStyle = style ?? {};
    this.currentEvents = events ?? {};

    if (!material) {
      this.container.innerHTML = `<div class="gct-prop-panel__empty">
        <div style="font-size:32px;margin-bottom:8px">🎯</div>
        <div>选择画布中的组件</div>
        <div style="font-size:12px;color:#999;margin-top:4px">查看和编辑属性</div>
      </div>`;
      return;
    }

    this.container.innerHTML = `
      <div class="gct-prop-panel">
        <div class="gct-prop-panel__header">
          <span class="gct-prop-panel__icon">${material.icon}</span>
          <span class="gct-prop-panel__name">${material.name}</span>
          <span class="gct-prop-panel__id">${material.id}</span>
        </div>
        <div class="gct-prop-panel__tabs">
          ${this.tabs.filter((t) => t.visible).map((t) => `
            <button class="gct-prop-tab ${t.id === this.activeTab ? 'gct-prop-tab--active' : ''}" data-tab="${t.id}">
              <span>${t.icon}</span> ${t.label}
            </button>
          `).join('')}
        </div>
        <div class="gct-prop-panel__content" id="gct-prop-content"></div>
      </div>
    `;

    // 绑定 Tab 切换
    this.container.querySelectorAll('.gct-prop-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = (btn as HTMLElement).dataset.tab as PanelTab;
        this.render(this.currentMaterial, this.currentProps, this.currentStyle, this.currentEvents);
      });
    });

    // 渲染当前 Tab 内容
    const contentEl = this.container.querySelector('#gct-prop-content') as HTMLElement;
    if (!contentEl) return;

    switch (this.activeTab) {
      case 'props':
        this.renderPropsTab(contentEl, material.propSchema);
        break;
      case 'style':
        this.renderStyleTab(contentEl);
        break;
      case 'events':
        this.renderEventsTab(contentEl, material.eventSchema ?? []);
        break;
      case 'animation':
        this.renderAnimationTab(contentEl);
        break;
      case 'data':
        this.renderDataTab(contentEl);
        break;
      case 'advanced':
        this.renderAdvancedTab(contentEl);
        break;
    }
  }

  // ─── 属性 Tab ────────────────────────────────────────────

  private renderPropsTab(el: HTMLElement, schema: PropSchema[]): void {
    // 按分组整理
    const groups = new Map<string, PropSchema[]>();
    for (const prop of schema) {
      const group = prop.group || '基础';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(prop);
    }

    let html = '';
    for (const [group, props] of groups) {
      html += `
        <div class="gct-prop-group">
          <div class="gct-prop-group__header" data-group="${group}">
            <span class="gct-prop-group__arrow">▸</span>
            <span>${group}</span>
          </div>
          <div class="gct-prop-group__body">
            ${props.map((p) => this.renderPropField(p)).join('')}
          </div>
        </div>
      `;
    }
    el.innerHTML = html;

    // 绑定折叠
    el.querySelectorAll('.gct-prop-group__header').forEach((header) => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling as HTMLElement;
        const arrow = header.querySelector('.gct-prop-group__arrow') as HTMLElement;
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : '';
        arrow.textContent = isOpen ? '▸' : '▾';
      });
    });

    // 绑定输入变化
    this.bindPropInputs(el);
  }

  private renderPropField(prop: PropSchema): string {
    const value = this.currentProps[prop.name] ?? prop.default ?? '';
    const id = `prop-${prop.name}`;

    let input = '';
    switch (prop.type) {
      case 'string':
        if (String(value).length > 50) {
          input = `<textarea id="${id}" data-prop="${prop.name}" class="gct-prop-input gct-prop-textarea" rows="3">${value}</textarea>`;
        } else {
          input = `<input type="text" id="${id}" data-prop="${prop.name}" value="${this.escapeHtml(String(value))}" class="gct-prop-input" />`;
        }
        break;

      case 'number':
        input = `<input type="number" id="${id}" data-prop="${prop.name}" value="${value}" class="gct-prop-input" />`;
        break;

      case 'boolean':
        input = `
          <label class="gct-prop-switch">
            <input type="checkbox" id="${id}" data-prop="${prop.name}" ${value ? 'checked' : ''} />
            <span class="gct-prop-switch__slider"></span>
          </label>
        `;
        break;

      case 'select':
        input = `<select id="${id}" data-prop="${prop.name}" class="gct-prop-input">
          ${(prop.options || []).map((o) => `<option value="${o.value}" ${value === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>`;
        break;

      case 'color':
        input = `
          <div class="gct-prop-color">
            <input type="color" id="${id}" data-prop="${prop.name}" value="${value || '#000000'}" class="gct-prop-color__input" />
            <input type="text" data-prop="${prop.name}" value="${value}" class="gct-prop-input gct-prop-color__text" />
          </div>
        `;
        break;

      case 'json':
        input = `<textarea id="${id}" data-prop="${prop.name}" class="gct-prop-input gct-prop-textarea gct-prop-code" rows="4">${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</textarea>`;
        break;

      case 'expression':
        input = `
          <div class="gct-prop-expression">
            <input type="text" id="${id}" data-prop="${prop.name}" value="${this.escapeHtml(String(value))}" class="gct-prop-input" placeholder="{{变量名}}" />
            <span class="gct-prop-expression__badge">fx</span>
          </div>
        `;
        break;

      default:
        input = `<input type="text" id="${id}" data-prop="${prop.name}" value="${this.escapeHtml(String(value))}" class="gct-prop-input" />`;
    }

    return `
      <div class="gct-prop-field ${prop.advanced ? 'gct-prop-field--advanced' : ''}" data-when="${prop.visibleWhen || ''}">
        <label class="gct-prop-label" for="${id}">
          ${prop.label}
          ${prop.required ? '<span class="gct-prop-required">*</span>' : ''}
        </label>
        ${input}
        ${prop.description ? `<div class="gct-prop-desc">${prop.description}</div>` : ''}
      </div>
    `;
  }

  private bindPropInputs(el: HTMLElement): void {
    el.querySelectorAll('[data-prop]').forEach((input) => {
      const el = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const propName = el.dataset.prop!;

      const handler = () => {
        let value: unknown;

        if (el.type === 'checkbox') {
          value = (el as HTMLInputElement).checked;
        } else if (el.type === 'number') {
          value = el.value === '' ? undefined : Number(el.value);
        } else if (el.classList.contains('gct-prop-code')) {
          try {
            value = JSON.parse(el.value);
          } catch {
            value = el.value;
          }
        } else {
          value = el.value;
        }

        this.currentProps[propName] = value;
        this.onChange?.(this.currentProps);
      };

      el.addEventListener('change', handler);
      if (el.tagName === 'TEXTAREA' || el.type === 'text') {
        el.addEventListener('input', handler);
      }

      // 颜色联动
      if (el.type === 'color') {
        el.addEventListener('input', () => {
          const textInput = el.parentElement?.querySelector('.gct-prop-color__text') as HTMLInputElement;
          if (textInput) textInput.value = el.value;
          handler();
        });
      }
    });
  }

  // ─── 样式 Tab ────────────────────────────────────────────

  private renderStyleTab(el: HTMLElement): void {
    const styleFields = [
      { group: '布局', fields: [
        { name: 'display', label: '显示', type: 'select', options: ['block', 'flex', 'grid', 'inline', 'inline-block', 'none'] },
        { name: 'flexDirection', label: '方向', type: 'select', options: ['row', 'column', 'row-reverse', 'column-reverse'] },
        { name: 'justifyContent', label: '水平对齐', type: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] },
        { name: 'alignItems', label: '垂直对齐', type: 'select', options: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'] },
        { name: 'gap', label: '间距', type: 'string' },
      ]},
      { group: '尺寸', fields: [
        { name: 'width', label: '宽度', type: 'string' },
        { name: 'height', label: '高度', type: 'string' },
        { name: 'minWidth', label: '最小宽度', type: 'string' },
        { name: 'maxWidth', label: '最大宽度', type: 'string' },
        { name: 'overflow', label: '溢出', type: 'select', options: ['visible', 'hidden', 'auto', 'scroll'] },
      ]},
      { group: '间距', fields: [
        { name: 'padding', label: '内边距', type: 'string' },
        { name: 'margin', label: '外边距', type: 'string' },
      ]},
      { group: '背景', fields: [
        { name: 'background', label: '背景', type: 'color' },
        { name: 'backgroundImage', label: '背景图', type: 'string' },
        { name: 'backgroundSize', label: '背景尺寸', type: 'select', options: ['cover', 'contain', 'auto'] },
      ]},
      { group: '边框', fields: [
        { name: 'border', label: '边框', type: 'string' },
        { name: 'borderRadius', label: '圆角', type: 'string' },
        { name: 'boxShadow', label: '阴影', type: 'string' },
      ]},
      { group: '文字', fields: [
        { name: 'color', label: '颜色', type: 'color' },
        { name: 'fontSize', label: '字号', type: 'string' },
        { name: 'fontWeight', label: '字重', type: 'select', options: ['normal', 'bold', '300', '500', '600', '700'] },
        { name: 'textAlign', label: '对齐', type: 'select', options: ['left', 'center', 'right'] },
        { name: 'lineHeight', label: '行高', type: 'string' },
      ]},
      { group: '变换', fields: [
        { name: 'transform', label: '变换', type: 'string' },
        { name: 'opacity', label: '透明度', type: 'string' },
        { name: 'transition', label: '过渡', type: 'string' },
        { name: 'cursor', label: '光标', type: 'select', options: ['default', 'pointer', 'not-allowed', 'text', 'move', 'grab'] },
      ]},
    ];

    let html = '';
    for (const group of styleFields) {
      html += `
        <div class="gct-prop-group">
          <div class="gct-prop-group__header" data-group="${group.group}">
            <span class="gct-prop-group__arrow">▸</span>
            <span>${group.group}</span>
          </div>
          <div class="gct-prop-group__body" style="display:none">
            ${group.fields.map((f) => {
              const value = this.currentStyle[f.name] ?? '';
              if (f.type === 'select') {
                return `<div class="gct-prop-field">
                  <label class="gct-prop-label">${f.label}</label>
                  <select data-style="${f.name}" class="gct-prop-input">
                    <option value="">-</option>
                    ${(f.options || []).map((o) => `<option value="${o}" ${value === o ? 'selected' : ''}>${o}</option>`).join('')}
                  </select>
                </div>`;
              }
              if (f.type === 'color') {
                return `<div class="gct-prop-field">
                  <label class="gct-prop-label">${f.label}</label>
                  <div class="gct-prop-color">
                    <input type="color" data-style="${f.name}" value="${value || '#ffffff'}" class="gct-prop-color__input" />
                    <input type="text" data-style="${f.name}" value="${value}" class="gct-prop-input gct-prop-color__text" />
                  </div>
                </div>`;
              }
              return `<div class="gct-prop-field">
                <label class="gct-prop-label">${f.label}</label>
                <input type="text" data-style="${f.name}" value="${this.escapeHtml(value)}" class="gct-prop-input" placeholder="如 16px, #fff, auto" />
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    }
    el.innerHTML = html;

    // 折叠
    el.querySelectorAll('.gct-prop-group__header').forEach((header) => {
      header.addEventListener('click', () => {
        const body = header.nextElementSibling as HTMLElement;
        const arrow = header.querySelector('.gct-prop-group__arrow') as HTMLElement;
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : '';
        arrow.textContent = isOpen ? '▸' : '▾';
      });
    });

    // 输入绑定
    el.querySelectorAll('[data-style]').forEach((input) => {
      const el = input as HTMLInputElement | HTMLSelectElement;
      const styleName = el.dataset.style!;
      el.addEventListener('change', () => {
        if (el.value) {
          this.currentStyle[styleName] = el.value;
        } else {
          delete this.currentStyle[styleName];
        }
        this.onStyleChange?.(this.currentStyle);
      });
      if (el.type === 'color') {
        el.addEventListener('input', () => {
          const textInput = el.parentElement?.querySelector('.gct-prop-color__text') as HTMLInputElement;
          if (textInput) textInput.value = el.value;
          this.currentStyle[styleName] = el.value;
          this.onStyleChange?.(this.currentStyle);
        });
      }
    });
  }

  // ─── 事件 Tab ────────────────────────────────────────────

  private renderEventsTab(el: HTMLElement, eventSchema: Array<{ name: string; label: string; description?: string; params?: Array<{ name: string; type: string }> }>): void {
    if (eventSchema.length === 0) {
      el.innerHTML = '<div class="gct-prop-panel__empty" style="padding:20px">此组件暂无可配置事件</div>';
      return;
    }

    let html = '<div class="gct-events-list">';
    for (const evt of eventSchema) {
      const bindings = this.currentEvents[evt.name] || [];
      const hasBindings = bindings.length > 0;

      html += `
        <div class="gct-event-item ${hasBindings ? 'gct-event-item--bound' : ''}">
          <div class="gct-event-item__header">
            <div>
              <span class="gct-event-item__name">${evt.label}</span>
              <span class="gct-event-item__key">${evt.name}</span>
            </div>
            <button class="gct-event-item__add" data-event="${evt.name}" title="添加动作">＋</button>
          </div>
          ${evt.description ? `<div class="gct-event-item__desc">${evt.description}</div>` : ''}
          ${evt.params ? `<div class="gct-event-item__params">参数: ${evt.params.map((p) => `${p.name}:${p.type}`).join(', ')}</div>` : ''}
          ${hasBindings ? `
            <div class="gct-event-item__actions">
              ${bindings.map((action: any, i: number) => `
                <div class="gct-event-action">
                  <span class="gct-event-action__type">${action.type || '动作'}</span>
                  <span class="gct-event-action__desc">${action.config?.url || action.config?.eventName || action.config?.path || ''}</span>
                  <button class="gct-event-action__del" data-event="${evt.name}" data-index="${i}">✕</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }
    html += '</div>';
    el.innerHTML = html;

    // 绑定添加事件
    el.querySelectorAll('.gct-event-item__add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const eventName = (btn as HTMLElement).dataset.event!;
        // 弹出动作选择（简化版）
        const actionType = prompt('选择动作类型:\n1. setState - 设置变量\n2. http - HTTP请求\n3. navigate - 页面跳转\n4. showMessage - 显示消息\n5. emitEvent - 触发事件\n6. script - 自定义脚本\n\n请输入编号或名称:');
        if (!actionType) return;

        const actionMap: Record<string, string> = {
          '1': 'setState', '2': 'http', '3': 'navigate',
          '4': 'showMessage', '5': 'emitEvent', '6': 'script',
          'setState': 'setState', 'http': 'http', 'navigate': 'navigate',
          'showMessage': 'showMessage', 'emitEvent': 'emitEvent', 'script': 'script',
        };

        const action = actionMap[actionType];
        if (!action) return;

        if (!this.currentEvents[eventName]) this.currentEvents[eventName] = [];
        this.currentEvents[eventName].push({
          type: action,
          config: {},
        });

        this.onEventChange?.(this.currentEvents);
        this.renderEventsTab(el, this.currentMaterial?.eventSchema ?? []);
      });
    });

    // 删除事件
    el.querySelectorAll('.gct-event-action__del').forEach((btn) => {
      btn.addEventListener('click', () => {
        const eventName = (btn as HTMLElement).dataset.event!;
        const index = Number((btn as HTMLElement).dataset.index);
        if (this.currentEvents[eventName]) {
          this.currentEvents[eventName].splice(index, 1);
          this.onEventChange?.(this.currentEvents);
          this.renderEventsTab(el, this.currentMaterial?.eventSchema ?? []);
        }
      });
    });
  }

  // ─── 动画 Tab ────────────────────────────────────────────

  private renderAnimationTab(el: HTMLElement): void {
    el.innerHTML = `
      <div class="gct-animation-panel">
        <div class="gct-prop-field">
          <label class="gct-prop-label">入场动画</label>
          <select data-anim="entrance" class="gct-prop-input">
            <option value="">无</option>
            <option value="fade_in">淡入</option>
            <option value="fade_in_up">淡入上移</option>
            <option value="fade_in_down">淡入下移</option>
            <option value="fade_in_left">淡入左移</option>
            <option value="fade_in_right">淡入右移</option>
            <option value="zoom_in">缩放进入</option>
            <option value="bounce_in">弹跳进入</option>
            <option value="slide_in_up">向上滑入</option>
            <option value="slide_in_down">向下滑入</option>
            <option value="slide_in_left">向左滑入</option>
            <option value="slide_in_right">向右滑入</option>
            <option value="flip_in_x">X轴翻入</option>
            <option value="flip_in_y">Y轴翻入</option>
          </select>
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">悬停动画</label>
          <select data-anim="hover" class="gct-prop-input">
            <option value="">无</option>
            <option value="hover_lift">悬停上浮</option>
            <option value="hover_scale">悬停缩放</option>
            <option value="hover_glow">悬停发光</option>
          </select>
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">点击动画</label>
          <select data-anim="click" class="gct-prop-input">
            <option value="">无</option>
            <option value="click_pulse">点击脉冲</option>
            <option value="shake">抖动</option>
            <option value="swing">摇摆</option>
          </select>
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">持续动画</label>
          <select data-anim="loop" class="gct-prop-input">
            <option value="">无</option>
            <option value="spin">旋转</option>
            <option value="pulse">脉冲</option>
          </select>
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">动画时长 (ms)</label>
          <input type="number" data-anim="duration" value="500" class="gct-prop-input" min="100" step="100" />
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">延时 (ms)</label>
          <input type="number" data-anim="delay" value="0" class="gct-prop-input" min="0" step="100" />
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">缓动</label>
          <select data-anim="easing" class="gct-prop-input">
            <option value="ease">ease</option>
            <option value="ease-in">ease-in</option>
            <option value="ease-out">ease-out</option>
            <option value="ease-in-out">ease-in-out</option>
            <option value="linear">linear</option>
          </select>
        </div>
      </div>
    `;
  }

  // ─── 数据 Tab ────────────────────────────────────────────

  private renderDataTab(el: HTMLElement): void {
    el.innerHTML = `
      <div class="gct-data-panel">
        <div class="gct-prop-field">
          <label class="gct-prop-label">数据绑定</label>
          <div class="gct-prop-expression">
            <input type="text" data-bind="dataSource" class="gct-prop-input" placeholder="{{变量名或表达式}}" />
            <span class="gct-prop-expression__badge">fx</span>
          </div>
          <div class="gct-prop-desc">绑定到数据上下文中的变量，如 {{userList}} 或 {{api.getData()}}</div>
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">条件渲染</label>
          <div class="gct-prop-expression">
            <input type="text" data-bind="condition" class="gct-prop-input" placeholder="{{表达式，返回 true/false}}" />
            <span class="gct-prop-expression__badge">fx</span>
          </div>
          <div class="gct-prop-desc">当表达式为 true 时显示此组件</div>
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">循环渲染</label>
          <input type="text" data-bind="loopSource" class="gct-prop-input" placeholder="数据源变量名，如 list" />
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">循环变量名</label>
          <input type="text" data-bind="loopItem" class="gct-prop-input" value="item" placeholder="item" />
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">循环 Key</label>
          <input type="text" data-bind="loopKey" class="gct-prop-input" placeholder="用于唯一标识的字段名" />
        </div>
      </div>
    `;
  }

  // ─── 高级 Tab ────────────────────────────────────────────

  private renderAdvancedTab(el: HTMLElement): void {
    el.innerHTML = `
      <div class="gct-advanced-panel">
        <div class="gct-prop-field">
          <label class="gct-prop-label">组件名称</label>
          <input type="text" data-advanced="name" class="gct-prop-input" placeholder="给组件起个名字" />
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">CSS 类名</label>
          <input type="text" data-advanced="className" class="gct-prop-input" placeholder="空格分隔" />
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">自定义 ID</label>
          <input type="text" data-advanced="customId" class="gct-prop-input" placeholder="HTML id 属性" />
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">Z-Index</label>
          <input type="number" data-advanced="zIndex" class="gct-prop-input" />
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">锁定</label>
          <label class="gct-prop-switch">
            <input type="checkbox" data-advanced="locked" />
            <span class="gct-prop-switch__slider"></span>
          </label>
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">隐藏</label>
          <label class="gct-prop-switch">
            <input type="checkbox" data-advanced="hidden" />
            <span class="gct-prop-switch__slider"></span>
          </label>
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">权限控制</label>
          <input type="text" data-advanced="permissions" class="gct-prop-input" placeholder="逗号分隔权限标识" />
        </div>
        <div class="gct-prop-field">
          <label class="gct-prop-label">备注</label>
          <textarea data-advanced="comment" class="gct-prop-input gct-prop-textarea" rows="2" placeholder="开发备注，不会影响渲染"></textarea>
        </div>
      </div>
    `;
  }

  // ─── 工具 ────────────────────────────────────────────────

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
