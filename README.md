# Grid CSS Toolkit

GridStack.js - CSS Grid 转换工具包：编辑态拖拽排版，预览态纯 CSS Grid 渲染。

## 特性

- 基于 GridStack.js 的可视化拖拽编辑器
- 纯 CSS Grid 输出，零依赖预览
- 支持响应式断点配置
- 多种导出格式：CSS、HTML、JSON、Vue、React、Tailwind
- 完整的撤销/重做历史记录
- 右键上下文菜单
- 多选与批量操作
- 对齐辅助线与智能吸附
- 缩放控制与设备预览
- 布局快照与版本管理
- Lucide 图标库支持

## 安装

```bash
npm install grid-css-toolkit
# 或
pnpm add grid-css-toolkit
```

## 快速开始

```typescript
import { Editor, Preview, templates } from 'grid-css-toolkit';
import 'grid-css-toolkit/style.css';

// 创建编辑器
const editor = new Editor({
  container: '#editor',
  config: templates.dashboard(),
  theme: 'dark',
  showToolbar: true,
  showPropertyPanel: true,
});

// 创建预览
const preview = new Preview({
  container: '#preview',
  config: editor.getConfig(),
  responsive: true,
});
```

## 导出功能

```typescript
import { toCSS, toHTML, toJSON, toVue, toReact } from 'grid-css-toolkit';

const config = editor.getConfig();

// 导出 CSS
const css = toCSS(config);

// 导出 HTML
const html = toHTML(config);

// 导出 Vue 组件
const vue = toVue(config);

// 导出 React 组件
const react = toReact(config);
```

## 响应式配置

```typescript
const config = {
  columns: 12,
  widgets: [...],
  responsive: {
    breakpoints: [
      { name: 'mobile', maxWidth: 768, columns: 4 },
      { name: 'tablet', maxWidth: 1024, columns: 8 },
      { name: 'desktop', columns: 12 },
    ],
  },
};
```

## 模板

```typescript
import { templates } from 'grid-css-toolkit';

// 使用预设模板
const dashboard = templates.dashboard();
const sidebar = templates.sidebar();
const gallery = templates.gallery();
```

## API

### Editor

创建可视化编辑器实例。

```typescript
new Editor({
  container: HTMLElement | string,
  config?: Partial<GridConfig>,
  theme?: 'light' | 'dark',
  showToolbar?: boolean,
  showPropertyPanel?: boolean,
  onSave?: (config: GridConfig) => void,
  onChange?: (config: GridConfig) => void,
});
```

### Preview

创建预览实例。

```typescript
new Preview({
  container: HTMLElement | string,
  config: GridConfig,
  responsive?: boolean,
  animate?: boolean,
  widgetRenderer?: (widget: WidgetConfig) => string | HTMLElement,
});
```

### 转换函数

| 函数 | 说明 |
|------|------|
| `toCSSGrid(config)` | 转换为 CSS Grid 输出 |
| `toCSS(config)` | 导出 CSS 字符串 |
| `toHTML(config)` | 导出 HTML 字符串 |
| `toJSON(config)` | 导出 JSON 字符串 |
| `toVue(config)` | 导出 Vue SFC |
| `toReact(config)` | 导出 React 组件 |
| `toTailwind(config)` | 导出 Tailwind 类名 |
| `toAngular(config)` | 导出 Angular 组件 |
| `toSvelte(config)` | 导出 Svelte 组件 |

## 开发

```bash
# 安装依赖
pnpm install

# 启动 Playground
pnpm dev

# 构建库
pnpm build

# 类型检查
pnpm type-check
```

## 图标

本项目使用 Lucide 图标库，通过 SVG 内联方式渲染，无需额外依赖。

### 使用图标

```typescript
import { createIcon } from 'grid-css-toolkit/src/utils/icons';

// 创建图标 SVG
const iconSvg = createIcon('edit', 16);

// 在 HTML 中使用
element.innerHTML = `${createIcon('trash-2')} 删除`;
```

### 可用图标

查看 `src/utils/icons.ts` 获取完整图标列表。

## 许可证

MIT
