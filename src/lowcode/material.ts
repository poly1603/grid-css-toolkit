/**
 * 物料系统 - 内置物料 + 用户组装物料
 *
 * 核心能力：
 * - 内置物料注册（基础组件、业务组件）
 * - 用户组装物料（从画布选中组件组合为新物料）
 * - 物料分类、搜索、收藏
 * - 物料拖拽数据生成
 * - 物料实例化（带默认属性、事件、样式）
 */

import type { WidgetConfig, GridConfig } from '../types';
import type { ComponentDefinition, PropSchema, EventSchema } from './component-registry';
import { uid, deepClone } from '../core/converter';

// ─── 物料定义 ──────────────────────────────────────────────

export type MaterialType = 'basic' | 'business' | 'chart' | 'form' | 'media' | 'navigation' | 'layout' | 'custom';

export interface MaterialDefinition {
  /** 物料 ID */
  id: string;
  /** 物料名称 */
  name: string;
  /** 显示图标 */
  icon: string;
  /** 物料类型 */
  type: MaterialType;
  /** 分类标签 */
  category: string;
  /** 搜索标签 */
  tags: string[];
  /** 描述 */
  description?: string;
  /** 物料缩略图 (URL 或 base64) */
  thumbnail?: string;

  /** 默认尺寸 (网格单位) */
  defaultSize: { w: number; h: number };
  /** 最小尺寸 */
  minSize?: { w: number; h: number };
  /** 最大尺寸 */
  maxSize?: { w: number; h: number };

  /** 默认属性 */
  defaultProps: Record<string, unknown>;
  /** 属性 Schema (驱动右侧属性面板) */
  propSchema: PropSchema[];
  /** 事件 Schema */
  eventSchema?: EventSchema[];
  /** 默认样式 */
  defaultStyle?: Record<string, string>;
  /** 默认类名 */
  defaultClassName?: string;

  /** 渲染器：生成 Widget 内容 HTML */
  renderer: (props: Record<string, unknown>, style?: Record<string, string>) => string;
  /** 缩略图渲染 */
  thumbnailRenderer?: () => string;

  /** 是否容器（可嵌套子组件） */
  isContainer?: boolean;
  /** 子物料限制 */
  childMaterialTypes?: MaterialType[];

  /** 是否用户自定义 */
  isCustom?: boolean;
  /** 创建时间 */
  createdAt?: number;
  /** 使用次数 */
  usageCount?: number;
}

// ─── 物料实例化结果 ────────────────────────────────────────

export interface MaterialInstance {
  widgetConfig: WidgetConfig;
  componentId: string;
  props: Record<string, unknown>;
  style: Record<string, string>;
  events: Record<string, unknown[]>;
}

// ─── 内置物料定义 ──────────────────────────────────────────

function createBuiltinMaterials(): MaterialDefinition[] {
  return [
    // ── 布局类 ──────────────────────────────────────
    {
      id: 'mat_card',
      name: '卡片',
      icon: '▢',
      type: 'layout',
      category: '布局',
      tags: ['card', '卡片', '容器', '布局'],
      description: '通用卡片容器，支持标题和内容',
      defaultSize: { w: 4, h: 3 },
      minSize: { w: 2, h: 2 },
      defaultProps: {
        title: '卡片标题',
        content: '卡片内容区域，可以放置任何内容。',
        showHeader: true,
        showBorder: true,
        shadow: 'hover',
      },
      propSchema: [
        { name: 'title', label: '标题', type: 'string', default: '卡片标题', group: '基础' },
        { name: 'content', label: '内容', type: 'string', default: '卡片内容', group: '基础' },
        { name: 'showHeader', label: '显示头部', type: 'boolean', default: true, group: '基础' },
        { name: 'showBorder', label: '显示边框', type: 'boolean', default: true, group: '样式' },
        { name: 'shadow', label: '阴影', type: 'select', default: 'hover', options: [
          { label: '无', value: 'none' }, { label: '始终', value: 'always' }, { label: '悬停', value: 'hover' },
        ], group: '样式' },
        { name: 'headerBg', label: '头部背景', type: 'color', group: '样式' },
        { name: 'padding', label: '内边距', type: 'string', default: '16px', group: '样式' },
      ],
      eventSchema: [
        { name: 'onClick', label: '点击卡片', description: '卡片被点击时触发' },
      ],
      defaultStyle: { borderRadius: '8px', overflow: 'hidden' },
      renderer: (props) => `
        ${props.showHeader !== false ? `<div style="padding:12px 16px;font-weight:600;font-size:14px;border-bottom:1px solid #f0f0f0;${props.headerBg ? 'background:' + props.headerBg : ''}">${props.title}</div>` : ''}
        <div style="padding:${props.padding || '16px'};font-size:13px;color:#666;line-height:1.6">${props.content}</div>
      `,
      isContainer: true,
    },

    {
      id: 'mat_divider',
      name: '分割线',
      icon: '─',
      type: 'layout',
      category: '布局',
      tags: ['divider', '分割线', '分隔'],
      defaultSize: { w: 12, h: 1 },
      defaultProps: { text: '', orientation: 'center' },
      propSchema: [
        { name: 'text', label: '文字', type: 'string', group: '基础' },
        { name: 'orientation', label: '文字位置', type: 'select', default: 'center', options: [
          { label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' },
        ], group: '基础' },
        { name: 'dashed', label: '虚线', type: 'boolean', default: false, group: '样式' },
      ],
      renderer: (props) => {
        const borderStyle = props.dashed ? 'dashed' : 'solid';
        if (props.text) {
          return `<div style="display:flex;align-items:center;gap:12px;height:100%;padding:0 8px">
            ${props.orientation !== 'left' ? `<div style="flex:1;height:0;border-top:1px ${borderStyle} #e8e8e8"></div>` : ''}
            <span style="color:#999;font-size:12px;white-space:nowrap">${props.text}</span>
            ${props.orientation !== 'right' ? `<div style="flex:1;height:0;border-top:1px ${borderStyle} #e8e8e8"></div>` : ''}
          </div>`;
        }
        return `<div style="display:flex;align-items:center;height:100%;padding:0 8px"><div style="flex:1;height:0;border-top:1px ${borderStyle} #e8e8e8"></div></div>`;
      },
    },

    // ── 数据展示类 ──────────────────────────────────
    {
      id: 'mat_text',
      name: '文本',
      icon: '📝',
      type: 'basic',
      category: '基础',
      tags: ['text', '文本', '文字', '段落'],
      defaultSize: { w: 4, h: 2 },
      defaultProps: {
        content: '这是一段文本内容',
        fontSize: '14px',
        fontWeight: 'normal',
        color: '#333',
        textAlign: 'left',
        lineHeight: '1.6',
        ellipsis: false,
        maxLines: 0,
      },
      propSchema: [
        { name: 'content', label: '文本内容', type: 'string', default: '文本', group: '内容' },
        { name: 'fontSize', label: '字号', type: 'select', default: '14px', options: [
          { label: '12px', value: '12px' }, { label: '13px', value: '13px' }, { label: '14px', value: '14px' },
          { label: '16px', value: '16px' }, { label: '18px', value: '18px' }, { label: '20px', value: '20px' },
          { label: '24px', value: '24px' }, { label: '28px', value: '28px' }, { label: '32px', value: '32px' },
        ], group: '样式' },
        { name: 'fontWeight', label: '字重', type: 'select', default: 'normal', options: [
          { label: '细', value: '300' }, { label: '正常', value: 'normal' }, { label: '粗', value: 'bold' },
        ], group: '样式' },
        { name: 'color', label: '颜色', type: 'color', default: '#333', group: '样式' },
        { name: 'textAlign', label: '对齐', type: 'select', default: 'left', options: [
          { label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' },
        ], group: '样式' },
        { name: 'lineHeight', label: '行高', type: 'string', default: '1.6', group: '样式' },
        { name: 'ellipsis', label: '超出省略', type: 'boolean', default: false, group: '高级' },
        { name: 'maxLines', label: '最大行数', type: 'number', default: 0, group: '高级' },
      ],
      renderer: (props) => {
        let style = `font-size:${props.fontSize};font-weight:${props.fontWeight};color:${props.color};text-align:${props.textAlign};line-height:${props.lineHeight};padding:8px 12px`;
        if (props.ellipsis) {
          style += ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
        }
        if (props.maxLines && Number(props.maxLines) > 0) {
          style += `;display:-webkit-box;-webkit-line-clamp:${props.maxLines};-webkit-box-orient:vertical;overflow:hidden`;
        }
        return `<div style="${style}">${props.content}</div>`;
      },
    },

    {
      id: 'mat_stat',
      name: '统计卡片',
      icon: '📈',
      type: 'business',
      category: '数据',
      tags: ['stat', '统计', '指标', '数字', '数据'],
      description: '展示关键指标数据',
      defaultSize: { w: 3, h: 2 },
      defaultProps: {
        title: '总销售额',
        value: '¥ 126,560',
        trend: 'up',
        trendValue: '+12.5%',
        icon: '💰',
        color: '#1890ff',
      },
      propSchema: [
        { name: 'title', label: '指标名称', type: 'string', group: '数据' },
        { name: 'value', label: '指标值', type: 'string', group: '数据' },
        { name: 'trend', label: '趋势', type: 'select', default: 'up', options: [
          { label: '上升', value: 'up' }, { label: '下降', value: 'down' }, { label: '持平', value: 'flat' },
        ], group: '数据' },
        { name: 'trendValue', label: '趋势值', type: 'string', group: '数据' },
        { name: 'icon', label: '图标', type: 'string', default: '💰', group: '样式' },
        { name: 'color', label: '主题色', type: 'color', default: '#1890ff', group: '样式' },
      ],
      renderer: (props) => {
        const trendIcon = props.trend === 'up' ? '↑' : props.trend === 'down' ? '↓' : '→';
        const trendColor = props.trend === 'up' ? '#52c41a' : props.trend === 'down' ? '#f5222d' : '#999';
        return `<div style="padding:16px;height:100%;display:flex;flex-direction:column;justify-content:space-between">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;color:#666">${props.title}</span>
            <span style="font-size:24px">${props.icon}</span>
          </div>
          <div>
            <div style="font-size:24px;font-weight:700;color:${props.color}">${props.value}</div>
            <div style="font-size:12px;color:${trendColor};margin-top:4px">${trendIcon} ${props.trendValue}</div>
          </div>
        </div>`;
      },
    },

    {
      id: 'mat_image',
      name: '图片',
      icon: '🖼',
      type: 'media',
      category: '媒体',
      tags: ['image', '图片', '图像', '照片'],
      defaultSize: { w: 4, h: 3 },
      defaultProps: {
        src: 'https://picsum.photos/400/300',
        alt: '图片',
        fit: 'cover',
        borderRadius: '8px',
        showPreview: true,
      },
      propSchema: [
        { name: 'src', label: '图片地址', type: 'string', group: '基础' },
        { name: 'alt', label: '替代文字', type: 'string', group: '基础' },
        { name: 'fit', label: '填充方式', type: 'select', default: 'cover', options: [
          { label: '填充', value: 'cover' }, { label: '包含', value: 'contain' },
          { label: '拉伸', value: 'fill' }, { label: '原始', value: 'none' },
        ], group: '样式' },
        { name: 'borderRadius', label: '圆角', type: 'string', default: '8px', group: '样式' },
        { name: 'showPreview', label: '点击预览', type: 'boolean', default: true, group: '交互' },
      ],
      renderer: (props) => `<img src="${props.src}" alt="${props.alt}" style="width:100%;height:100%;object-fit:${props.fit};border-radius:${props.borderRadius};display:block" />`,
    },

    {
      id: 'mat_button',
      name: '按钮',
      icon: '🔘',
      type: 'form',
      category: '表单',
      tags: ['button', '按钮', '操作', '提交'],
      defaultSize: { w: 2, h: 1 },
      defaultProps: {
        text: '按钮',
        type: 'primary',
        size: 'middle',
        disabled: false,
        loading: false,
        block: false,
        icon: '',
        shape: 'default',
      },
      propSchema: [
        { name: 'text', label: '按钮文字', type: 'string', default: '按钮', group: '基础' },
        { name: 'type', label: '类型', type: 'select', default: 'primary', options: [
          { label: '主按钮', value: 'primary' }, { label: '次按钮', value: 'default' },
          { label: '虚线', value: 'dashed' }, { label: '文字', value: 'text' },
          { label: '链接', value: 'link' }, { label: '危险', value: 'danger' },
        ], group: '基础' },
        { name: 'size', label: '尺寸', type: 'select', default: 'middle', options: [
          { label: '小', value: 'small' }, { label: '中', value: 'middle' }, { label: '大', value: 'large' },
        ], group: '基础' },
        { name: 'shape', label: '形状', type: 'select', default: 'default', options: [
          { label: '默认', value: 'default' }, { label: '圆角', value: 'round' }, { label: '圆形', value: 'circle' },
        ], group: '基础' },
        { name: 'icon', label: '图标', type: 'string', group: '基础' },
        { name: 'disabled', label: '禁用', type: 'boolean', default: false, group: '状态' },
        { name: 'loading', label: '加载中', type: 'boolean', default: false, group: '状态' },
        { name: 'block', label: '撑满宽度', type: 'boolean', default: false, group: '样式' },
      ],
      eventSchema: [
        { name: 'onClick', label: '点击', description: '按钮点击时触发' },
      ],
      renderer: (props) => {
        const colors: Record<string, string> = {
          primary: '#1890ff', default: '#fff', dashed: '#fff',
          text: 'transparent', link: 'transparent', danger: '#ff4d4f',
        };
        const textColors: Record<string, string> = {
          primary: '#fff', default: '#333', dashed: '#333',
          text: '#1890ff', link: '#1890ff', danger: '#fff',
        };
        const borderColors: Record<string, string> = {
          primary: '#1890ff', default: '#d9d9d9', dashed: '#d9d9d9',
          text: 'transparent', link: 'transparent', danger: '#ff4d4f',
        };
        const sizeMap: Record<string, string> = { small: '24px', middle: '32px', large: '40px' };
        const fontSizeMap: Record<string, string> = { small: '12px', middle: '14px', large: '16px' };
        const bg = colors[props.type as string] || colors.primary;
        const tc = textColors[props.type as string] || textColors.primary;
        const bc = borderColors[props.type as string] || borderColors.primary;
        const h = sizeMap[props.size as string] || sizeMap.middle;
        const fs = fontSizeMap[props.size as string] || fontSizeMap.middle;
        const border = props.type === 'dashed' ? '1px dashed ' + bc : props.type === 'text' || props.type === 'link' ? 'none' : '1px solid ' + bc;
        const radius = props.shape === 'round' ? '999px' : props.shape === 'circle' ? '50%' : '6px';
        const opacity = props.disabled ? '0.5' : '1';
        return `<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:4px">
          <button style="height:${h};padding:0 ${props.shape === 'circle' ? '0' : '16px'};font-size:${fs};background:${bg};color:${tc};border:${border};border-radius:${radius};cursor:${props.disabled ? 'not-allowed' : 'pointer'};opacity:${opacity};display:inline-flex;align-items:center;gap:6px;${props.block ? 'width:100%;justify-content:center' : ''}">
            ${props.loading ? '⏳' : ''}${props.icon ? '<span>' + props.icon + '</span>' : ''}${props.text}
          </button>
        </div>`;
      },
    },

    {
      id: 'mat_input',
      name: '输入框',
      icon: '⌨',
      type: 'form',
      category: '表单',
      tags: ['input', '输入', '文本框', '表单'],
      defaultSize: { w: 4, h: 1 },
      defaultProps: {
        placeholder: '请输入',
        label: '标签',
        value: '',
        type: 'text',
        disabled: false,
        allowClear: true,
        showLabel: true,
      },
      propSchema: [
        { name: 'label', label: '标签', type: 'string', group: '基础' },
        { name: 'placeholder', label: '占位文字', type: 'string', group: '基础' },
        { name: 'value', label: '默认值', type: 'string', group: '数据' },
        { name: 'type', label: '类型', type: 'select', default: 'text', options: [
          { label: '文本', value: 'text' }, { label: '数字', value: 'number' },
          { label: '密码', value: 'password' }, { label: '邮箱', value: 'email' },
        ], group: '基础' },
        { name: 'disabled', label: '禁用', type: 'boolean', group: '状态' },
        { name: 'allowClear', label: '可清除', type: 'boolean', default: true, group: '交互' },
        { name: 'showLabel', label: '显示标签', type: 'boolean', default: true, group: '样式' },
      ],
      eventSchema: [
        { name: 'onChange', label: '值变化', description: '输入值变化时触发', params: [{ name: 'value', type: 'string' }] },
        { name: 'onFocus', label: '聚焦', description: '输入框聚焦时触发' },
        { name: 'onBlur', label: '失焦', description: '输入框失焦时触发' },
        { name: 'onPressEnter', label: '回车', description: '按下回车时触发' },
      ],
      renderer: (props) => `
        <div style="height:100%;display:flex;align-items:center;padding:4px 12px;gap:8px">
          ${props.showLabel ? `<label style="font-size:13px;color:#666;white-space:nowrap;min-width:60px">${props.label}</label>` : ''}
          <input type="${props.type}" placeholder="${props.placeholder}" value="${props.value || ''}"
            ${props.disabled ? 'disabled' : ''}
            style="flex:1;height:32px;padding:0 10px;border:1px solid #d9d9d9;border-radius:6px;font-size:13px;outline:none;${props.disabled ? 'background:#f5f5f5;cursor:not-allowed' : ''}" />
          ${props.allowClear ? '<span style="cursor:pointer;color:#bbb;font-size:14px">✕</span>' : ''}
        </div>
      `,
    },

    {
      id: 'mat_table',
      name: '表格',
      icon: '📋',
      type: 'business',
      category: '数据',
      tags: ['table', '表格', '列表', '数据'],
      description: '数据表格，支持列配置',
      defaultSize: { w: 8, h: 5 },
      defaultProps: {
        columns: [
          { key: 'name', title: '姓名', width: 120 },
          { key: 'age', title: '年龄', width: 80 },
          { key: 'address', title: '地址', width: 200 },
        ],
        data: [
          { name: '张三', age: 28, address: '北京市海淀区' },
          { name: '李四', age: 32, address: '上海市浦东新区' },
          { name: '王五', age: 25, address: '深圳市南山区' },
        ],
        showHeader: true,
        bordered: true,
        striped: true,
        size: 'middle',
        pagination: false,
        pageSize: 10,
      },
      propSchema: [
        { name: 'columns', label: '列配置', type: 'json', group: '数据' },
        { name: 'data', label: '数据', type: 'json', group: '数据' },
        { name: 'showHeader', label: '显示表头', type: 'boolean', default: true, group: '样式' },
        { name: 'bordered', label: '边框', type: 'boolean', default: true, group: '样式' },
        { name: 'striped', label: '斑马纹', type: 'boolean', default: true, group: '样式' },
        { name: 'size', label: '尺寸', type: 'select', default: 'middle', options: [
          { label: '紧凑', value: 'small' }, { label: '默认', value: 'middle' }, { label: '宽松', value: 'large' },
        ], group: '样式' },
        { name: 'pagination', label: '分页', type: 'boolean', default: false, group: '功能' },
        { name: 'pageSize', label: '每页条数', type: 'number', default: 10, group: '功能' },
      ],
      eventSchema: [
        { name: 'onRowClick', label: '行点击', description: '点击行时触发', params: [{ name: 'record', type: 'object' }, { name: 'index', type: 'number' }] },
        { name: 'onSort', label: '排序', description: '点击列头排序时触发', params: [{ name: 'key', type: 'string' }, { name: 'order', type: 'string' }] },
      ],
      renderer: (props) => {
        const cols = Array.isArray(props.columns) ? props.columns : [];
        const rows = Array.isArray(props.data) ? props.data : [];
        const cellPad = props.size === 'small' ? '6px 8px' : props.size === 'large' ? '14px 16px' : '10px 12px';
        const border = props.bordered ? '1px solid #e8e8e8' : 'none';
        let html = `<div style="height:100%;overflow:auto;font-size:13px">
          <table style="width:100%;border-collapse:collapse;border:${border}">`;
        if (props.showHeader) {
          html += '<thead><tr>';
          cols.forEach((c: any) => {
            html += `<th style="padding:${cellPad};background:#fafafa;border:${border};text-align:left;font-weight:600;white-space:nowrap;${c.width ? 'width:' + c.width + 'px' : ''}">${c.title}</th>`;
          });
          html += '</tr></thead>';
        }
        html += '<tbody>';
        rows.forEach((row: any, i: number) => {
          html += `<tr style="${props.striped && i % 2 ? 'background:#fafafa' : ''}">`;
          cols.forEach((c: any) => {
            html += `<td style="padding:${cellPad};border:${border}">${row[c.key] ?? ''}</td>`;
          });
          html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
      },
    },

    {
      id: 'mat_progress',
      name: '进度条',
      icon: '▰',
      type: 'business',
      category: '数据',
      tags: ['progress', '进度', '百分比'],
      defaultSize: { w: 4, h: 1 },
      defaultProps: { percent: 75, status: 'active', showText: true, color: '#1890ff', strokeWidth: 8 },
      propSchema: [
        { name: 'percent', label: '进度', type: 'number', default: 75, group: '数据' },
        { name: 'status', label: '状态', type: 'select', default: 'active', options: [
          { label: '正常', value: 'active' }, { label: '成功', value: 'success' },
          { label: '异常', value: 'exception' }, { label: '预警', value: 'warning' },
        ], group: '状态' },
        { name: 'showText', label: '显示文字', type: 'boolean', default: true, group: '样式' },
        { name: 'color', label: '颜色', type: 'color', group: '样式' },
        { name: 'strokeWidth', label: '粗细', type: 'number', default: 8, group: '样式' },
      ],
      renderer: (props) => {
        const p = Math.min(100, Math.max(0, Number(props.percent) || 0));
        const statusColors: Record<string, string> = { active: String(props.color || '#1890ff'), success: '#52c41a', exception: '#ff4d4f', warning: '#faad14' };
        const c = statusColors[props.status as string] || statusColors.active;
        return `<div style="height:100%;display:flex;align-items:center;padding:8px 12px;gap:10px">
          <div style="flex:1;height:${props.strokeWidth}px;background:#f0f0f0;border-radius:999px;overflow:hidden">
            <div style="width:${p}%;height:100%;background:${c};border-radius:999px;transition:width 0.3s"></div>
          </div>
          ${props.showText ? `<span style="font-size:13px;font-weight:600;color:${c};min-width:40px;text-align:right">${p}%</span>` : ''}
        </div>`;
      },
    },

    {
      id: 'mat_avatar',
      name: '头像',
      icon: '👤',
      type: 'media',
      category: '媒体',
      tags: ['avatar', '头像', '用户'],
      defaultSize: { w: 2, h: 2 },
      defaultProps: {
        src: '',
        text: 'U',
        size: 64,
        shape: 'circle',
        color: '#1890ff',
        bgColor: '#e6f7ff',
      },
      propSchema: [
        { name: 'src', label: '图片地址', type: 'string', group: '基础' },
        { name: 'text', label: '文字', type: 'string', default: 'U', group: '基础' },
        { name: 'size', label: '尺寸', type: 'number', default: 64, group: '样式' },
        { name: 'shape', label: '形状', type: 'select', default: 'circle', options: [
          { label: '圆形', value: 'circle' }, { label: '方形', value: 'square' },
        ], group: '样式' },
        { name: 'color', label: '文字颜色', type: 'color', default: '#1890ff', group: '样式' },
        { name: 'bgColor', label: '背景色', type: 'color', default: '#e6f7ff', group: '样式' },
      ],
      renderer: (props) => {
        const radius = props.shape === 'circle' ? '50%' : '8px';
        if (props.src) {
          return `<div style="height:100%;display:flex;align-items:center;justify-content:center"><img src="${props.src}" style="width:${props.size}px;height:${props.size}px;border-radius:${radius};object-fit:cover" /></div>`;
        }
        return `<div style="height:100%;display:flex;align-items:center;justify-content:center">
          <div style="width:${props.size}px;height:${props.size}px;border-radius:${radius};background:${props.bgColor};color:${props.color};display:flex;align-items:center;justify-content:center;font-size:${Number(props.size) * 0.4}px;font-weight:600">${props.text}</div>
        </div>`;
      },
    },

    {
      id: 'mat_badge',
      name: '徽标',
      icon: '🔴',
      type: 'basic',
      category: '基础',
      tags: ['badge', '徽标', '角标', '通知'],
      defaultSize: { w: 2, h: 1 },
      defaultProps: { count: 5, showZero: false, dot: false, color: '#f5222d', text: '消息通知' },
      propSchema: [
        { name: 'text', label: '文字', type: 'string', group: '基础' },
        { name: 'count', label: '数量', type: 'number', default: 5, group: '数据' },
        { name: 'dot', label: '圆点模式', type: 'boolean', default: false, group: '样式' },
        { name: 'showZero', label: '显示零', type: 'boolean', default: false, group: '样式' },
        { name: 'color', label: '颜色', type: 'color', default: '#f5222d', group: '样式' },
      ],
      renderer: (props) => {
        const show = props.dot || (Number(props.count) > 0) || props.showZero;
        return `<div style="height:100%;display:flex;align-items:center;padding:8px 12px;gap:8px">
          <span style="font-size:14px">${props.text}</span>
          ${show ? (props.dot
            ? `<span style="width:8px;height:8px;border-radius:50%;background:${props.color};display:inline-block"></span>`
            : `<span style="background:${props.color};color:#fff;font-size:12px;padding:0 6px;border-radius:10px;min-width:18px;text-align:center;line-height:18px;display:inline-block">${props.count}</span>`
          ) : ''}
        </div>`;
      },
    },

    {
      id: 'mat_tag',
      name: '标签',
      icon: '🏷',
      type: 'basic',
      category: '基础',
      tags: ['tag', '标签', '标记'],
      defaultSize: { w: 2, h: 1 },
      defaultProps: { text: '标签', color: 'blue', closable: false, bordered: true },
      propSchema: [
        { name: 'text', label: '文字', type: 'string', group: '基础' },
        { name: 'color', label: '颜色', type: 'select', default: 'blue', options: [
          { label: '蓝', value: 'blue' }, { label: '绿', value: 'green' }, { label: '红', value: 'red' },
          { label: '橙', value: 'orange' }, { label: '紫', value: 'purple' }, { label: '灰', value: 'default' },
        ], group: '样式' },
        { name: 'closable', label: '可关闭', type: 'boolean', default: false, group: '交互' },
        { name: 'bordered', label: '边框', type: 'boolean', default: true, group: '样式' },
      ],
      eventSchema: [
        { name: 'onClose', label: '关闭', description: '点击关闭按钮时触发' },
      ],
      renderer: (props) => {
        const colorMap: Record<string, { bg: string; text: string; border: string }> = {
          blue: { bg: '#e6f7ff', text: '#1890ff', border: '#91d5ff' },
          green: { bg: '#f6ffed', text: '#52c41a', border: '#b7eb8f' },
          red: { bg: '#fff2f0', text: '#f5222d', border: '#ffa39e' },
          orange: { bg: '#fff7e6', text: '#fa8c16', border: '#ffd591' },
          purple: { bg: '#f9f0ff', text: '#722ed1', border: '#d3adf7' },
          default: { bg: '#fafafa', text: '#666', border: '#d9d9d9' },
        };
        const c = colorMap[props.color as string] || colorMap.blue;
        return `<div style="height:100%;display:flex;align-items:center;padding:8px 12px">
          <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;font-size:12px;background:${c.bg};color:${c.text};border:${props.bordered ? '1px solid ' + c.border : 'none'};border-radius:4px">
            ${props.text}${props.closable ? '<span style="cursor:pointer;margin-left:2px">✕</span>' : ''}
          </span>
        </div>`;
      },
    },

    {
      id: 'mat_alert',
      name: '警告提示',
      icon: '⚠',
      type: 'basic',
      category: '基础',
      tags: ['alert', '警告', '提示', '通知'],
      defaultSize: { w: 6, h: 1 },
      defaultProps: { message: '这是一条提示信息', type: 'info', showIcon: true, closable: false },
      propSchema: [
        { name: 'message', label: '提示内容', type: 'string', group: '基础' },
        { name: 'type', label: '类型', type: 'select', default: 'info', options: [
          { label: '信息', value: 'info' }, { label: '成功', value: 'success' },
          { label: '警告', value: 'warning' }, { label: '错误', value: 'error' },
        ], group: '基础' },
        { name: 'showIcon', label: '显示图标', type: 'boolean', default: true, group: '样式' },
        { name: 'closable', label: '可关闭', type: 'boolean', default: false, group: '交互' },
      ],
      renderer: (props) => {
        const styles: Record<string, { bg: string; border: string; icon: string; color: string }> = {
          info: { bg: '#e6f7ff', border: '#91d5ff', icon: 'ℹ️', color: '#1890ff' },
          success: { bg: '#f6ffed', border: '#b7eb8f', icon: '✅', color: '#52c41a' },
          warning: { bg: '#fffbe6', border: '#ffe58f', icon: '⚠️', color: '#faad14' },
          error: { bg: '#fff2f0', border: '#ffa39e', icon: '❌', color: '#f5222d' },
        };
        const s = styles[props.type as string] || styles.info;
        return `<div style="height:100%;display:flex;align-items:center;padding:4px 12px">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:${s.bg};border:1px solid ${s.border};border-radius:6px;font-size:13px;color:${s.color};flex:1">
            ${props.showIcon ? `<span>${s.icon}</span>` : ''}
            <span style="flex:1">${props.message}</span>
            ${props.closable ? '<span style="cursor:pointer">✕</span>' : ''}
          </div>
        </div>`;
      },
    },
  ];
}

// ─── 物料管理器 ────────────────────────────────────────────

export class MaterialManager {
  private materials = new Map<string, MaterialDefinition>();
  private favorites = new Set<string>();
  private usageCount = new Map<string, number>();
  private static STORAGE_KEY = 'gct-materials';
  private static FAVORITES_KEY = 'gct-material-favorites';

  constructor() {
    this.loadBuiltin();
    this.loadCustom();
    this.loadFavorites();
  }

  // ─── 初始化 ──────────────────────────────────────────────

  private loadBuiltin(): void {
    for (const mat of createBuiltinMaterials()) {
      this.materials.set(mat.id, mat);
    }
  }

  private loadCustom(): void {
    try {
      const raw = localStorage.getItem(MaterialManager.STORAGE_KEY);
      if (raw) {
        const customs: MaterialDefinition[] = JSON.parse(raw);
        customs.forEach((m) => this.materials.set(m.id, { ...m, isCustom: true }));
      }
    } catch { /* ignore */ }
  }

  private loadFavorites(): void {
    try {
      const raw = localStorage.getItem(MaterialManager.FAVORITES_KEY);
      if (raw) this.favorites = new Set(JSON.parse(raw));
    } catch { /* ignore */ }
  }

  private saveCustom(): void {
    const customs = Array.from(this.materials.values()).filter((m) => m.isCustom);
    localStorage.setItem(MaterialManager.STORAGE_KEY, JSON.stringify(customs));
  }

  private saveFavorites(): void {
    localStorage.setItem(MaterialManager.FAVORITES_KEY, JSON.stringify([...this.favorites]));
  }

  // ─── 查询 ────────────────────────────────────────────────

  /** 获取所有物料 */
  getAll(): MaterialDefinition[] {
    return Array.from(this.materials.values());
  }

  /** 获取内置物料 */
  getBuiltin(): MaterialDefinition[] {
    return Array.from(this.materials.values()).filter((m) => !m.isCustom);
  }

  /** 获取用户自定义物料 */
  getCustom(): MaterialDefinition[] {
    return Array.from(this.materials.values()).filter((m) => m.isCustom);
  }

  /** 按分类获取 */
  getByCategory(category: string): MaterialDefinition[] {
    return Array.from(this.materials.values()).filter((m) => m.category === category);
  }

  /** 获取所有分类 */
  getCategories(): string[] {
    return [...new Set(Array.from(this.materials.values()).map((m) => m.category))];
  }

  /** 搜索物料 */
  search(query: string): MaterialDefinition[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    return Array.from(this.materials.values()).filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.tags.some((t) => t.includes(q)) ||
        m.description?.toLowerCase().includes(q)
    );
  }

  /** 获取物料 */
  get(id: string): MaterialDefinition | undefined {
    return this.materials.get(id);
  }

  /** 获取收藏物料 */
  getFavorites(): MaterialDefinition[] {
    return [...this.favorites].map((id) => this.materials.get(id)).filter(Boolean) as MaterialDefinition[];
  }

  /** 切换收藏 */
  toggleFavorite(id: string): boolean {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
      this.saveFavorites();
      return false;
    } else {
      this.favorites.add(id);
      this.saveFavorites();
      return true;
    }
  }

  isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }

  // ─── 用户组装物料 ────────────────────────────────────────

  /**
   * 从画布选中的组件创建自定义物料
   */
  createFromSelection(
    widgets: WidgetConfig[],
    name: string,
    icon: string,
    category = '自定义'
  ): MaterialDefinition {
    // 计算整体包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const w of widgets) {
      minX = Math.min(minX, w.rect.x);
      minY = Math.min(minY, w.rect.y);
      maxX = Math.max(maxX, w.rect.x + w.rect.w);
      maxY = Math.max(maxY, w.rect.y + w.rect.h);
    }

    const width = maxX - minX;
    const height = maxY - minY;

    // 提取公共属性作为可配置项
    const propSchema: PropSchema[] = [];
    const defaultProps: Record<string, unknown> = {};

    for (const w of widgets) {
      if (w.content) {
        propSchema.push({
          name: `${w.id}_content`,
          label: `${w.id} 内容`,
          type: 'string',
          default: w.content,
          group: '内容',
        });
        defaultProps[`${w.id}_content`] = w.content;
      }
    }

    const id = `custom_${uid()}`;
    const material: MaterialDefinition = {
      id,
      name,
      icon,
      type: 'custom',
      category,
      tags: ['custom', name.toLowerCase()],
      description: `用户组装物料，包含 ${widgets.length} 个组件`,
      defaultSize: { w: width, h: height },
      minSize: { w: Math.max(1, Math.floor(width / 2)), h: Math.max(1, Math.floor(height / 2)) },
      defaultProps,
      propSchema,
      defaultStyle: {},
      renderer: (props) => {
        // 组合渲染：将子组件按相对位置排列
        let html = '<div style="position:relative;width:100%;height:100%">';
        for (const w of widgets) {
          const relX = ((w.rect.x - minX) / width * 100).toFixed(2);
          const relY = ((w.rect.y - minY) / height * 100).toFixed(2);
          const relW = (w.rect.w / width * 100).toFixed(2);
          const relH = (w.rect.h / height * 100).toFixed(2);
          const content = props[`${w.id}_content`] ?? w.content ?? '';
          html += `<div style="position:absolute;left:${relX}%;top:${relY}%;width:${relW}%;height:${relH}%;overflow:hidden">${content}</div>`;
        }
        html += '</div>';
        return html;
      },
      isCustom: true,
      createdAt: Date.now(),
      usageCount: 0,
    };

    this.materials.set(id, material);
    this.saveCustom();
    return material;
  }

  /** 注册自定义物料 */
  register(material: MaterialDefinition): void {
    this.materials.set(material.id, { ...material, isCustom: material.isCustom ?? true });
    this.saveCustom();
  }

  /** 删除自定义物料 */
  deleteCustom(id: string): void {
    const mat = this.materials.get(id);
    if (mat?.isCustom) {
      this.materials.delete(id);
      this.favorites.delete(id);
      this.saveCustom();
      this.saveFavorites();
    }
  }

  // ─── 实例化 ──────────────────────────────────────────────

  /**
   * 物料 → WidgetConfig (拖入画布时调用)
   */
  instantiate(materialId: string, overrides?: Partial<WidgetConfig>): MaterialInstance {
    const mat = this.materials.get(materialId);
    if (!mat) throw new Error(`Material "${materialId}" not found`);

    // 记录使用次数
    this.usageCount.set(materialId, (this.usageCount.get(materialId) || 0) + 1);

    const widgetConfig: WidgetConfig = {
      id: uid(),
      rect: { x: 0, y: 0, w: mat.defaultSize.w, h: mat.defaultSize.h },
      content: mat.renderer(mat.defaultProps, mat.defaultStyle),
      contentType: 'html',
      className: mat.defaultClassName,
      style: mat.defaultStyle as any,
      minW: mat.minSize?.w,
      minH: mat.minSize?.h,
      maxW: mat.maxSize?.w,
      maxH: mat.maxSize?.h,
      autoPosition: true,
      visible: true,
      data: {
        materialId: mat.id,
        materialName: mat.name,
        props: { ...mat.defaultProps },
      },
      ...overrides,
    };

    return {
      widgetConfig,
      componentId: mat.id,
      props: { ...mat.defaultProps },
      style: { ...mat.defaultStyle } as Record<string, string>,
      events: {},
    };
  }

  /**
   * 刷新 Widget 内容 (属性变更后)
   */
  renderWidget(widget: WidgetConfig): string {
    const materialId = (widget.data as any)?.materialId;
    if (!materialId) return widget.content ?? '';

    const mat = this.materials.get(materialId);
    if (!mat) return widget.content ?? '';

    const props = (widget.data as any)?.props ?? mat.defaultProps;
    return mat.renderer(props, widget.style as Record<string, string>);
  }

  // ─── 拖拽数据 ────────────────────────────────────────────

  /**
   * 生成拖拽数据 (用于 dataTransfer)
   */
  createDragData(materialId: string): string {
    const mat = this.materials.get(materialId);
    if (!mat) return '';
    return JSON.stringify({
      type: 'material',
      materialId: mat.id,
      name: mat.name,
      defaultSize: mat.defaultSize,
    });
  }

  /**
   * 解析拖拽数据
   */
  parseDragData(data: string): { materialId: string; name: string; defaultSize: { w: number; h: number } } | null {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'material') return parsed;
      return null;
    } catch {
      return null;
    }
  }

  // ─── 排序 ────────────────────────────────────────────────

  /** 按使用频率排序 */
  getByUsage(): MaterialDefinition[] {
    return this.getAll().sort((a, b) => (this.usageCount.get(b.id) || 0) - (this.usageCount.get(a.id) || 0));
  }

  /** 获取最近使用 */
  getRecent(limit = 10): MaterialDefinition[] {
    return this.getByUsage().slice(0, limit);
  }

  destroy(): void {
    this.materials.clear();
    this.favorites.clear();
    this.usageCount.clear();
  }
}
