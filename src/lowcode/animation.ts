/**
 * 动画系统 - 低代码平台的动画能力
 *
 * 功能：
 * - 入场/出场动画
 * - 交互动画（hover/click/focus）
 * - 滚动触发动画
 * - 动画编排（序列/并行/延时）
 * - 预设动画库
 * - 自定义关键帧
 */

import { uid } from '../core/converter';

// ─── 动画类型 ──────────────────────────────────────────────

export type AnimationTrigger = 'mount' | 'scroll' | 'hover' | 'click' | 'focus' | 'dataChange' | 'manual';
export type AnimationDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
export type AnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';
export type AnimationTimingFunction = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | string;

export interface Keyframe {
  offset: string; // '0%', '50%', '100%' 或 'from', 'to'
  properties: Record<string, string>;
}

export interface AnimationConfig {
  id: string;
  name: string;
  trigger: AnimationTrigger;
  /** 动画时长 (ms) */
  duration: number;
  /** 延时 (ms) */
  delay?: number;
  /** 重复次数 (0=无限) */
  iterationCount?: number;
  /** 方向 */
  direction?: AnimationDirection;
  /** 填充模式 */
  fillMode?: AnimationFillMode;
  /** 缓动函数 */
  timingFunction?: AnimationTimingFunction;
  /** 关键帧 */
  keyframes: Keyframe[];
  /** 是否禁用 */
  disabled?: boolean;
}

export interface InteractionAnimation {
  /** hover 动画 */
  hover?: AnimationConfig;
  /** click 动画 */
  click?: AnimationConfig;
  /** focus 动画 */
  focus?: AnimationConfig;
}

export interface ScrollAnimation {
  /** 触发阈值 (0-1) */
  threshold?: number;
  /** 触发方向 */
  direction?: 'up' | 'down' | 'both';
  /** 只触发一次 */
  once?: boolean;
  animation: AnimationConfig;
}

// ─── 预设动画 ──────────────────────────────────────────────

export interface AnimationPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  animation: Omit<AnimationConfig, 'id'>;
}

const ANIMATION_PRESETS: AnimationPreset[] = [
  // 淡入
  { id: 'fade_in', name: '淡入', category: '淡入', icon: '🌅', animation: { name: '淡入', trigger: 'mount', duration: 500, fillMode: 'both', timingFunction: 'ease-out', keyframes: [
    { offset: 'from', properties: { opacity: '0' } },
    { offset: 'to', properties: { opacity: '1' } },
  ]}},
  { id: 'fade_in_up', name: '淡入上移', category: '淡入', icon: '⬆', animation: { name: '淡入上移', trigger: 'mount', duration: 500, fillMode: 'both', timingFunction: 'ease-out', keyframes: [
    { offset: 'from', properties: { opacity: '0', transform: 'translateY(30px)' } },
    { offset: 'to', properties: { opacity: '1', transform: 'translateY(0)' } },
  ]}},
  { id: 'fade_in_down', name: '淡入下移', category: '淡入', icon: '⬇', animation: { name: '淡入下移', trigger: 'mount', duration: 500, fillMode: 'both', timingFunction: 'ease-out', keyframes: [
    { offset: 'from', properties: { opacity: '0', transform: 'translateY(-30px)' } },
    { offset: 'to', properties: { opacity: '1', transform: 'translateY(0)' } },
  ]}},
  { id: 'fade_in_left', name: '淡入左移', category: '淡入', icon: '⬅', animation: { name: '淡入左移', trigger: 'mount', duration: 500, fillMode: 'both', timingFunction: 'ease-out', keyframes: [
    { offset: 'from', properties: { opacity: '0', transform: 'translateX(-30px)' } },
    { offset: 'to', properties: { opacity: '1', transform: 'translateX(0)' } },
  ]}},
  { id: 'fade_in_right', name: '淡入右移', category: '淡入', icon: '➡', animation: { name: '淡入右移', trigger: 'mount', duration: 500, fillMode: 'both', timingFunction: 'ease-out', keyframes: [
    { offset: 'from', properties: { opacity: '0', transform: 'translateX(30px)' } },
    { offset: 'to', properties: { opacity: '1', transform: 'translateX(0)' } },
  ]}},

  // 缩放
  { id: 'zoom_in', name: '缩放进入', category: '缩放', icon: '🔍', animation: { name: '缩放进入', trigger: 'mount', duration: 400, fillMode: 'both', timingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', keyframes: [
    { offset: 'from', properties: { opacity: '0', transform: 'scale(0.5)' } },
    { offset: 'to', properties: { opacity: '1', transform: 'scale(1)' } },
  ]}},
  { id: 'zoom_out', name: '缩放退出', category: '缩放', icon: '🔎', animation: { name: '缩放退出', trigger: 'mount', duration: 400, fillMode: 'both', timingFunction: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)', keyframes: [
    { offset: 'from', properties: { opacity: '1', transform: 'scale(1)' } },
    { offset: 'to', properties: { opacity: '0', transform: 'scale(0.5)' } },
  ]}},
  { id: 'bounce_in', name: '弹跳进入', category: '缩放', icon: '🏀', animation: { name: '弹跳进入', trigger: 'mount', duration: 800, fillMode: 'both', keyframes: [
    { offset: '0%', properties: { opacity: '0', transform: 'scale(0.3)' } },
    { offset: '50%', properties: { opacity: '1', transform: 'scale(1.05)' } },
    { offset: '70%', properties: { transform: 'scale(0.9)' } },
    { offset: '100%', properties: { opacity: '1', transform: 'scale(1)' } },
  ]}},

  // 滑入
  { id: 'slide_in_up', name: '向上滑入', category: '滑入', icon: '⬆', animation: { name: '向上滑入', trigger: 'mount', duration: 500, fillMode: 'both', timingFunction: 'ease-out', keyframes: [
    { offset: 'from', properties: { transform: 'translateY(100%)' } },
    { offset: 'to', properties: { transform: 'translateY(0)' } },
  ]}},
  { id: 'slide_in_down', name: '向下滑入', category: '滑入', icon: '⬇', animation: { name: '向下滑入', trigger: 'mount', duration: 500, fillMode: 'both', timingFunction: 'ease-out', keyframes: [
    { offset: 'from', properties: { transform: 'translateY(-100%)' } },
    { offset: 'to', properties: { transform: 'translateY(0)' } },
  ]}},
  { id: 'slide_in_left', name: '向左滑入', category: '滑入', icon: '⬅', animation: { name: '向左滑入', trigger: 'mount', duration: 500, fillMode: 'both', timingFunction: 'ease-out', keyframes: [
    { offset: 'from', properties: { transform: 'translateX(-100%)' } },
    { offset: 'to', properties: { transform: 'translateX(0)' } },
  ]}},
  { id: 'slide_in_right', name: '向右滑入', category: '滑入', icon: '➡', animation: { name: '向右滑入', trigger: 'mount', duration: 500, fillMode: 'both', timingFunction: 'ease-out', keyframes: [
    { offset: 'from', properties: { transform: 'translateX(100%)' } },
    { offset: 'to', properties: { transform: 'translateX(0)' } },
  ]}},

  // 翻转
  { id: 'flip_in_x', name: 'X轴翻入', category: '翻转', icon: '🔄', animation: { name: 'X轴翻入', trigger: 'mount', duration: 600, fillMode: 'both', keyframes: [
    { offset: 'from', properties: { opacity: '0', transform: 'perspective(400px) rotateX(90deg)' } },
    { offset: '40%', properties: { transform: 'perspective(400px) rotateX(-10deg)' } },
    { offset: '70%', properties: { transform: 'perspective(400px) rotateX(10deg)' } },
    { offset: 'to', properties: { opacity: '1', transform: 'perspective(400px) rotateX(0)' } },
  ]}},
  { id: 'flip_in_y', name: 'Y轴翻入', category: '翻转', icon: '🔃', animation: { name: 'Y轴翻入', trigger: 'mount', duration: 600, fillMode: 'both', keyframes: [
    { offset: 'from', properties: { opacity: '0', transform: 'perspective(400px) rotateY(90deg)' } },
    { offset: '40%', properties: { transform: 'perspective(400px) rotateY(-10deg)' } },
    { offset: '70%', properties: { transform: 'perspective(400px) rotateY(10deg)' } },
    { offset: 'to', properties: { opacity: '1', transform: 'perspective(400px) rotateY(0)' } },
  ]}},

  // 交互动画
  { id: 'hover_lift', name: '悬停上浮', category: '交互', icon: '👆', animation: { name: '悬停上浮', trigger: 'hover', duration: 200, keyframes: [
    { offset: 'from', properties: { transform: 'translateY(0)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } },
    { offset: 'to', properties: { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' } },
  ]}},
  { id: 'hover_scale', name: '悬停缩放', category: '交互', icon: '🔍', animation: { name: '悬停缩放', trigger: 'hover', duration: 200, keyframes: [
    { offset: 'from', properties: { transform: 'scale(1)' } },
    { offset: 'to', properties: { transform: 'scale(1.05)' } },
  ]}},
  { id: 'hover_glow', name: '悬停发光', category: '交互', icon: '✨', animation: { name: '悬停发光', trigger: 'hover', duration: 300, keyframes: [
    { offset: 'from', properties: { boxShadow: '0 0 0 rgba(79,143,247,0)' } },
    { offset: 'to', properties: { boxShadow: '0 0 20px rgba(79,143,247,0.4)' } },
  ]}},
  { id: 'click_pulse', name: '点击脉冲', category: '交互', icon: '💓', animation: { name: '点击脉冲', trigger: 'click', duration: 300, keyframes: [
    { offset: '0%', properties: { transform: 'scale(1)' } },
    { offset: '50%', properties: { transform: 'scale(0.95)' } },
    { offset: '100%', properties: { transform: 'scale(1)' } },
  ]}},

  // 持续动画
  { id: 'spin', name: '旋转', category: '持续', icon: '🔄', animation: { name: '旋转', trigger: 'mount', duration: 1000, iterationCount: 0, keyframes: [
    { offset: 'from', properties: { transform: 'rotate(0deg)' } },
    { offset: 'to', properties: { transform: 'rotate(360deg)' } },
  ]}},
  { id: 'pulse', name: '脉冲', category: '持续', icon: '💗', animation: { name: '脉冲', trigger: 'mount', duration: 1500, iterationCount: 0, keyframes: [
    { offset: '0%', properties: { transform: 'scale(1)' } },
    { offset: '50%', properties: { transform: 'scale(1.05)' } },
    { offset: '100%', properties: { transform: 'scale(1)' } },
  ]}},
  { id: 'shake', name: '抖动', category: '持续', icon: '🫨', animation: { name: '抖动', trigger: 'click', duration: 500, keyframes: [
    { offset: '0%, 100%', properties: { transform: 'translateX(0)' } },
    { offset: '10%, 30%, 50%, 70%, 90%', properties: { transform: 'translateX(-4px)' } },
    { offset: '20%, 40%, 60%, 80%', properties: { transform: 'translateX(4px)' } },
  ]}},
  { id: 'swing', name: '摇摆', category: '持续', icon: '🔔', animation: { name: '摇摆', trigger: 'click', duration: 600, keyframes: [
    { offset: '20%', properties: { transform: 'rotate(15deg)' } },
    { offset: '40%', properties: { transform: 'rotate(-10deg)' } },
    { offset: '60%', properties: { transform: 'rotate(5deg)' } },
    { offset: '80%', properties: { transform: 'rotate(-5deg)' } },
    { offset: '100%', properties: { transform: 'rotate(0)' } },
  ]}},
];

// ─── 动画管理器 ────────────────────────────────────────────

export class AnimationManager {
  private styleEl: HTMLStyleElement;
  private animations = new Map<string, AnimationConfig>();
  private widgetAnimations = new Map<string, string[]>(); // widgetId → animationIds
  private presets: AnimationPreset[] = [...ANIMATION_PRESETS];
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'gct-animations';
    document.head.appendChild(this.styleEl);
    this.initScrollObserver();
  }

  // ─── 预设 ────────────────────────────────────────────────

  getPresets(): AnimationPreset[] {
    return [...this.presets];
  }

  getPresetsByCategory(category: string): AnimationPreset[] {
    return this.presets.filter((p) => p.category === category);
  }

  getPresetCategories(): string[] {
    return [...new Set(this.presets.map((p) => p.category))];
  }

  addPreset(preset: AnimationPreset): void {
    this.presets.push(preset);
  }

  // ─── 动画配置 ────────────────────────────────────────────

  /** 创建动画 */
  create(config: Omit<AnimationConfig, 'id'>): AnimationConfig {
    const animation: AnimationConfig = { ...config, id: uid() };
    this.animations.set(animation.id, animation);
    this.injectCSS(animation);
    return animation;
  }

  /** 从预设创建 */
  createFromPreset(presetId: string, overrides?: Partial<AnimationConfig>): AnimationConfig | null {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return null;
    return this.create({ ...preset.animation, ...overrides });
  }

  /** 更新动画 */
  update(id: string, changes: Partial<AnimationConfig>): void {
    const anim = this.animations.get(id);
    if (!anim) return;
    Object.assign(anim, changes);
    this.injectCSS(anim);
  }

  /** 删除动画 */
  remove(id: string): void {
    this.animations.delete(id);
    // 清理 widget 绑定
    for (const [wid, aids] of this.widgetAnimations) {
      this.widgetAnimations.set(wid, aids.filter((a) => a !== id));
    }
    this.generateStylesheet();
  }

  // ─── Widget 绑定 ─────────────────────────────────────────

  /** 绑定动画到 Widget */
  bindToWidget(widgetId: string, animationId: string): void {
    if (!this.animations.has(animationId)) return;
    const existing = this.widgetAnimations.get(widgetId) || [];
    if (!existing.includes(animationId)) {
      existing.push(animationId);
      this.widgetAnimations.set(widgetId, existing);
    }
    this.generateStylesheet();
  }

  /** 解绑动画 */
  unbindFromWidget(widgetId: string, animationId: string): void {
    const existing = this.widgetAnimations.get(widgetId) || [];
    this.widgetAnimations.set(widgetId, existing.filter((a) => a !== animationId));
    this.generateStylesheet();
  }

  /** 获取 Widget 的动画 */
  getWidgetAnimations(widgetId: string): AnimationConfig[] {
    const ids = this.widgetAnimations.get(widgetId) || [];
    return ids.map((id) => this.animations.get(id)).filter(Boolean) as AnimationConfig[];
  }

  /** 清除 Widget 所有动画 */
  clearWidgetAnimations(widgetId: string): void {
    this.widgetAnimations.delete(widgetId);
    this.generateStylesheet();
  }

  // ─── CSS 生成 ────────────────────────────────────────────

  private injectCSS(anim: AnimationConfig): void {
    this.generateStylesheet();
  }

  private generateStylesheet(): void {
    let css = '';

    // 为每个 widget 生成动画样式
    for (const [widgetId, animIds] of this.widgetAnimations) {
      for (const animId of animIds) {
        const anim = this.animations.get(animId);
        if (!anim || anim.disabled) continue;

        const selector = `[data-gct-id="${widgetId}"]`;
        const kfName = `gct-anim-${animId}`;

        // 关键帧
        css += `@keyframes ${kfName} {\n`;
        for (const kf of anim.keyframes) {
          css += `  ${kf.offset} {\n`;
          for (const [prop, val] of Object.entries(kf.properties)) {
            css += `    ${prop}: ${val};\n`;
          }
          css += `  }\n`;
        }
        css += `}\n`;

        // 触发动画
        switch (anim.trigger) {
          case 'mount':
            css += `${selector} {\n`;
            css += `  animation: ${kfName} ${anim.duration}ms ${anim.timingFunction || 'ease'} ${anim.delay || 0}ms ${anim.iterationCount === 0 ? 'infinite' : (anim.iterationCount || 1)} ${anim.direction || 'normal'} ${anim.fillMode || 'both'};\n`;
            css += `}\n`;
            break;

          case 'hover':
            css += `${selector}:hover {\n`;
            css += `  animation: ${kfName} ${anim.duration}ms ${anim.timingFunction || 'ease'} ${anim.delay || 0}ms ${anim.iterationCount === 0 ? 'infinite' : (anim.iterationCount || 1)} ${anim.direction || 'normal'} ${anim.fillMode || 'both'};\n`;
            css += `}\n`;
            break;

          case 'click':
            css += `${selector}:active {\n`;
            css += `  animation: ${kfName} ${anim.duration}ms ${anim.timingFunction || 'ease'} ${anim.delay || 0}ms ${anim.iterationCount || 1} ${anim.direction || 'normal'} ${anim.fillMode || 'both'};\n`;
            css += `}\n`;
            break;

          case 'focus':
            css += `${selector}:focus {\n`;
            css += `  animation: ${kfName} ${anim.duration}ms ${anim.timingFunction || 'ease'} ${anim.delay || 0}ms ${anim.iterationCount || 1} ${anim.direction || 'normal'} ${anim.fillMode || 'both'};\n`;
            css += `}\n`;
            break;

          case 'scroll':
            css += `${selector}.gct-scroll-visible {\n`;
            css += `  animation: ${kfName} ${anim.duration}ms ${anim.timingFunction || 'ease'} ${anim.delay || 0}ms ${anim.iterationCount || 1} ${anim.direction || 'normal'} ${anim.fillMode || 'both'};\n`;
            css += `}\n`;
            break;
        }
      }
    }

    this.styleEl.textContent = css;
  }

  // ─── 滚动动画 ────────────────────────────────────────────

  private initScrollObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('gct-scroll-visible');
          }
        }
      },
      { threshold: 0.1 }
    );
  }

  /** 注册滚动动画元素 */
  observeScroll(element: HTMLElement): void {
    this.observer?.observe(element);
  }

  /** 取消滚动观察 */
  unobserveScroll(element: HTMLElement): void {
    this.observer?.unobserve(element);
  }

  // ─── 序列动画 ────────────────────────────────────────────

  /**
   * 创建序列动画（多个 Widget 依次播放）
   */
  createSequence(widgetIds: string[], presetId: string, staggerMs = 100): void {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return;

    widgetIds.forEach((wid, index) => {
      const anim = this.create({
        ...preset.animation,
        delay: index * staggerMs,
      });
      this.bindToWidget(wid, anim.id);
    });
  }

  // ─── 序列化 ──────────────────────────────────────────────

  /** 导出动画配置 */
  export(): string {
    const data = {
      animations: Array.from(this.animations.entries()),
      bindings: Array.from(this.widgetAnimations.entries()),
    };
    return JSON.stringify(data, null, 2);
  }

  /** 导入动画配置 */
  import(json: string): void {
    const data = JSON.parse(json);
    if (data.animations) {
      for (const [id, anim] of data.animations) {
        this.animations.set(id, anim as AnimationConfig);
      }
    }
    if (data.bindings) {
      for (const [wid, aids] of data.bindings) {
        this.widgetAnimations.set(wid, aids as string[]);
      }
    }
    this.generateStylesheet();
  }

  destroy(): void {
    this.observer?.disconnect();
    this.styleEl.remove();
    this.animations.clear();
    this.widgetAnimations.clear();
  }
}
