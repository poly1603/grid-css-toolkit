/**
 * 缩放控制 + 设备预览框
 */

export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export class ZoomController {
  private container: HTMLElement;
  private contentEl: HTMLElement;
  private state: ZoomState = { scale: 1, offsetX: 0, offsetY: 0 };
  private minScale = 0.25;
  private maxScale = 3;
  private step = 0.1;
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private onChange?: (state: ZoomState) => void;

  constructor(container: HTMLElement, contentEl: HTMLElement, onChange?: (state: ZoomState) => void) {
    this.container = container;
    this.contentEl = contentEl;
    this.onChange = onChange;

    this.container.style.overflow = 'hidden';
    this.container.style.position = 'relative';

    this.initWheel();
    this.initPan();
    this.applyTransform();
  }

  private initWheel(): void {
    this.container.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const delta = e.deltaY > 0 ? -this.step : this.step;
      const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.state.scale + delta));

      // 以鼠标位置为中心缩放
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const ratio = newScale / this.state.scale;
      this.state.offsetX = mouseX - (mouseX - this.state.offsetX) * ratio;
      this.state.offsetY = mouseY - (mouseY - this.state.offsetY) * ratio;
      this.state.scale = newScale;

      this.applyTransform();
    }, { passive: false });
  }

  private initPan(): void {
    // 中键拖拽平移
    this.container.addEventListener('mousedown', (e) => {
      if (e.button !== 1 && !(e.button === 0 && e.altKey)) return; // 中键或 Alt+左键
      e.preventDefault();
      this.isPanning = true;
      this.panStart = { x: e.clientX - this.state.offsetX, y: e.clientY - this.state.offsetY };
      this.container.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      this.state.offsetX = e.clientX - this.panStart.x;
      this.state.offsetY = e.clientY - this.panStart.y;
      this.applyTransform();
    });

    document.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.container.style.cursor = '';
      }
    });
  }

  private applyTransform(): void {
    this.contentEl.style.transform = `translate(${this.state.offsetX}px, ${this.state.offsetY}px) scale(${this.state.scale})`;
    this.contentEl.style.transformOrigin = '0 0';
    this.onChange?.(this.state);
  }

  zoomIn(): void {
    this.state.scale = Math.min(this.maxScale, this.state.scale + this.step);
    this.applyTransform();
  }

  zoomOut(): void {
    this.state.scale = Math.max(this.minScale, this.state.scale - this.step);
    this.applyTransform();
  }

  zoomReset(): void {
    this.state = { scale: 1, offsetX: 0, offsetY: 0 };
    this.applyTransform();
  }

  zoomFit(): void {
    const containerRect = this.container.getBoundingClientRect();
    const contentRect = this.contentEl.getBoundingClientRect();
    const scaleX = containerRect.width / contentRect.width;
    const scaleY = containerRect.height / contentRect.height;
    this.state.scale = Math.min(scaleX, scaleY, 1) * 0.95;
    this.state.offsetX = (containerRect.width - contentRect.width * this.state.scale) / 2;
    this.state.offsetY = (containerRect.height - contentRect.height * this.state.scale) / 2;
    this.applyTransform();
  }

  getScale(): number {
    return this.state.scale;
  }

  getState(): ZoomState {
    return { ...this.state };
  }

  setState(state: ZoomState): void {
    this.state = state;
    this.applyTransform();
  }

  /** 渲染缩放控制条 */
  renderControls(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'gct-zoom-controls';
    el.innerHTML = `
      <button class="gct-zoom__btn" data-zoom="out" title="缩小 (Ctrl+-)">−</button>
      <span class="gct-zoom__label">${Math.round(this.state.scale * 100)}%</span>
      <button class="gct-zoom__btn" data-zoom="in" title="放大 (Ctrl+=)">+</button>
      <button class="gct-zoom__btn" data-zoom="reset" title="重置 (Ctrl+0)">⊡</button>
      <button class="gct-zoom__btn" data-zoom="fit" title="适应">⬜</button>
    `;

    el.querySelector('[data-zoom="in"]')?.addEventListener('click', () => this.zoomIn());
    el.querySelector('[data-zoom="out"]')?.addEventListener('click', () => this.zoomOut());
    el.querySelector('[data-zoom="reset"]')?.addEventListener('click', () => this.zoomReset());
    el.querySelector('[data-zoom="fit"]')?.addEventListener('click', () => this.zoomFit());

    this.onChange = (s) => {
      const label = el.querySelector('.gct-zoom__label');
      if (label) label.textContent = `${Math.round(s.scale * 100)}%`;
    };

    return el;
  }

  destroy(): void {
    this.contentEl.style.transform = '';
  }
}

// ─── 设备预览框 ────────────────────────────────────────────

export interface DevicePreset {
  name: string;
  label: string;
  width: number;
  height: number;
  icon: string;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { name: 'desktop', label: '桌面', width: 1440, height: 900, icon: '🖥' },
  { name: 'laptop', label: '笔记本', width: 1366, height: 768, icon: '💻' },
  { name: 'tablet-landscape', label: '平板横屏', width: 1024, height: 768, icon: '📱' },
  { name: 'tablet-portrait', label: '平板竖屏', width: 768, height: 1024, icon: '📱' },
  { name: 'mobile-large', label: '大手机', width: 428, height: 926, icon: '📲' },
  { name: 'mobile', label: '手机', width: 375, height: 812, icon: '📱' },
  { name: 'mobile-small', label: '小手机', width: 320, height: 568, icon: '📱' },
];

export class DeviceFrame {
  private wrapperEl: HTMLElement;
  private frameEl!: HTMLElement;
  private currentDevice: DevicePreset | null = null;
  private enabled = false;

  constructor(wrapperEl: HTMLElement) {
    this.wrapperEl = wrapperEl;
  }

  toggle(device?: DevicePreset): void {
    if (device) {
      this.currentDevice = device;
      this.enabled = true;
    } else {
      this.enabled = !this.enabled;
    }
    this.apply();
  }

  private apply(): void {
    this.wrapperEl.classList.toggle('gct-device-frame--active', this.enabled);
    if (!this.enabled || !this.currentDevice) {
      this.wrapperEl.style.maxWidth = '';
      this.wrapperEl.style.margin = '';
      this.wrapperEl.style.boxShadow = '';
      this.wrapperEl.style.borderRadius = '';
      this.wrapperEl.style.border = '';
      return;
    }

    this.wrapperEl.style.maxWidth = `${this.currentDevice.width}px`;
    this.wrapperEl.style.margin = '20px auto';
    this.wrapperEl.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)';
    this.wrapperEl.style.borderRadius = '12px';
    this.wrapperEl.style.border = '2px solid #334155';
    this.wrapperEl.style.overflow = 'hidden';
  }

  /** 渲染设备选择器 */
  renderSelector(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'gct-device-selector';
    el.innerHTML = `
      <select class="gct-device-select">
        <option value="">自由尺寸</option>
        ${DEVICE_PRESETS.map((d) => `<option value="${d.name}">${d.icon} ${d.label} (${d.width}×${d.height})</option>`).join('')}
      </select>
    `;

    el.querySelector('select')?.addEventListener('change', (e) => {
      const name = (e.target as HTMLSelectElement).value;
      const device = DEVICE_PRESETS.find((d) => d.name === name);
      if (device) {
        this.toggle(device);
      } else {
        this.enabled = false;
        this.apply();
      }
    });

    return el;
  }

  destroy(): void {
    this.enabled = false;
    this.apply();
  }
}
