/**
 * Grid CSS Toolkit - Playground
 */

import { Editor, Preview, templates, toCSSGrid, toJSON, toCSS, toHTML, toVue, toReact, toTailwind, toAngular, toSvelte } from 'grid-css-toolkit';
import 'gridstack/dist/gridstack.min.css';
import 'grid-css-toolkit/style.css';
import type { GridConfig } from 'grid-css-toolkit';

// ─── 状态 ──────────────────────────────────────────────────

let editor: Editor;
let preview: Preview | null = null;
let currentConfig: GridConfig;
let currentCodeTab = 'css';

// ─── 初始化编辑器 ──────────────────────────────────────────

function initEditor(config?: Partial<GridConfig>) {
  // 销毁旧实例
  editor?.destroy();
  preview?.destroy();
  preview = null;

  try {
    editor = new Editor({
      container: '#editor-container',
      config: config ?? templates.dashboard(),
      theme: 'dark',
      showToolbar: true,
      showPropertyPanel: true,
      onChange: (cfg) => {
        currentConfig = cfg;
        updateStatusBar();
      },
      onSave: (cfg) => {
        console.log('Saved:', cfg);
        showNotification('布局已保存到 localStorage');
      },
    });

    currentConfig = editor.getConfig();

    // 加载已保存的布局
    if (!config) {
      editor.loadFromStorage();
      currentConfig = editor.getConfig();
    }

    updateStatusBar();
  } catch (err) {
    console.error('[Demo] Editor init failed:', err);
    showNotification('编辑器初始化失败: ' + (err as Error).message);
  }
}

// ─── Tab 切换 ──────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.demo-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = (tab as HTMLElement).dataset.tab!;
      document.querySelectorAll('.demo-tab').forEach((t) => t.classList.remove('demo-tab--active'));
      document.querySelectorAll('.demo-panel').forEach((p) => p.classList.remove('demo-panel--active'));
      tab.classList.add('demo-tab--active');
      document.querySelector(`[data-panel="${name}"]`)?.classList.add('demo-panel--active');

      // 切换时刷新预览/代码
      if (name === 'preview') refreshPreview();
      if (name === 'code') refreshCode();
    });
  });
}

// ─── 预览刷新 ──────────────────────────────────────────────

function refreshPreview() {
  preview?.destroy();
  const cfg = editor.getConfig();
  preview = new Preview({
    container: '#preview-container',
    config: cfg,
    responsive: true,
    animate: true,
    widgetRenderer: (w) => {
      return `
        <div style="
          padding: 16px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
          ${w.content ?? w.id}
        </div>
      `;
    },
  });
}

// ─── 代码刷新 ──────────────────────────────────────────────

function refreshCode() {
  const cfg = editor.getConfig();
  const outputEl = document.getElementById('code-output')!;
  let code = '';

  switch (currentCodeTab) {
    case 'css':
      code = toCSS(cfg);
      break;
    case 'html':
      code = toHTML(cfg);
      break;
    case 'json':
      code = toJSON(cfg);
      break;
    case 'vue':
      code = toVue(cfg);
      break;
    case 'react':
      code = toReact(cfg);
      break;
    case 'tailwind':
      code = toTailwind(cfg);
      break;
    case 'angular':
      code = toAngular(cfg);
      break;
    case 'svelte':
      code = toSvelte(cfg);
      break;
  }

  outputEl.textContent = code;
}

function initCodeTabs() {
  document.querySelectorAll('.code-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentCodeTab = (tab as HTMLElement).dataset.code!;
      document.querySelectorAll('.code-tab').forEach((t) => t.classList.remove('code-tab--active'));
      tab.classList.add('code-tab--active');
      refreshCode();
    });
  });
}

// ─── 模板按钮 ──────────────────────────────────────────────

function initTemplateButtons() {
  document.getElementById('btn-template-dashboard')?.addEventListener('click', () => {
    initEditor(templates.dashboard());
  });
  document.getElementById('btn-template-sidebar')?.addEventListener('click', () => {
    initEditor(templates.sidebar());
  });
  document.getElementById('btn-template-gallery')?.addEventListener('click', () => {
    initEditor(templates.gallery());
  });
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (confirm('确定清空所有 Widget？')) {
      editor.clearAll();
    }
  });
}

// ─── 状态栏更新 ────────────────────────────────────────────

function updateStatusBar() {
  const widgetCount = currentConfig?.widgets?.length ?? 0;
  const widgetCountEl = document.getElementById('widget-count');
  if (widgetCountEl) {
    widgetCountEl.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
      ${widgetCount} 个 Widget
    `;
  }
}

// ─── 通知 ──────────────────────────────────────────────────

function showNotification(message: string) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: slideUp 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// ─── 启动 ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  initTabs();
  initCodeTabs();
  initTemplateButtons();
  initCopyButton();
});

// ─── 复制按钮 ──────────────────────────────────────────────

function initCopyButton() {
  document.getElementById('btn-copy-code')?.addEventListener('click', () => {
    const outputEl = document.getElementById('code-output');
    if (!outputEl?.textContent) return;
    navigator.clipboard.writeText(outputEl.textContent).then(() => {
      const btn = document.getElementById('btn-copy-code');
      btn?.classList.add('copied');
      const original = btn?.innerHTML;
      if (btn) btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> 已复制';
      setTimeout(() => {
        if (btn && original) {
          btn.innerHTML = original;
          btn.classList.remove('copied');
        }
      }, 1500);
    });
  });
}
