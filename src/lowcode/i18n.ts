/**
 * 国际化 (i18n) - 多语言支持
 */

export type LocaleMessages = Record<string, string | Record<string, string>>;

export interface LocaleConfig {
  name: string;
  label: string;
  messages: LocaleMessages;
}

// ─── i18n 管理器 ───────────────────────────────────────────

export class I18nManager {
  private locales = new Map<string, LocaleConfig>();
  private currentLocale = 'zh-CN';
  private fallbackLocale = 'en';
  private onChange?: (locale: string) => void;

  constructor(defaultLocale = 'zh-CN') {
    this.currentLocale = defaultLocale;

    // 注册内置语言
    this.registerLocale({
      name: 'zh-CN',
      label: '简体中文',
      messages: {
        common: {
          confirm: '确认',
          cancel: '取消',
          save: '保存',
          delete: '删除',
          edit: '编辑',
          add: '添加',
          search: '搜索',
          reset: '重置',
          submit: '提交',
          back: '返回',
          loading: '加载中...',
          noData: '暂无数据',
          success: '操作成功',
          error: '操作失败',
          warning: '警告',
          info: '提示',
        },
        editor: {
          addWidget: '添加 Widget',
          deleteWidget: '删除 Widget',
          duplicateWidget: '复制 Widget',
          lockWidget: '锁定 Widget',
          unlockWidget: '解锁 Widget',
          moveUp: '上移',
          moveDown: '下移',
          bringToFront: '移到最前',
          sendToBack: '移到最后',
          preview: '预览',
          save: '保存',
          undo: '撤销',
          redo: '重做',
          export: '导出',
          import: '导入',
          clear: '清空',
          settings: '设置',
        },
        data: {
          dataSource: '数据源',
          addDataSource: '添加数据源',
          apiConfig: 'API 配置',
          mockData: 'Mock 数据',
          transform: '数据转换',
          refresh: '刷新',
          cache: '缓存',
        },
        theme: {
          themeSettings: '主题设置',
          preset: '预设',
          custom: '自定义',
          resetTheme: '重置主题',
          exportTheme: '导出主题',
          importTheme: '导入主题',
        },
      },
    });

    this.registerLocale({
      name: 'en',
      label: 'English',
      messages: {
        common: {
          confirm: 'Confirm',
          cancel: 'Cancel',
          save: 'Save',
          delete: 'Delete',
          edit: 'Edit',
          add: 'Add',
          search: 'Search',
          reset: 'Reset',
          submit: 'Submit',
          back: 'Back',
          loading: 'Loading...',
          noData: 'No Data',
          success: 'Success',
          error: 'Error',
          warning: 'Warning',
          info: 'Info',
        },
        editor: {
          addWidget: 'Add Widget',
          deleteWidget: 'Delete Widget',
          duplicateWidget: 'Duplicate Widget',
          lockWidget: 'Lock Widget',
          unlockWidget: 'Unlock Widget',
          moveUp: 'Move Up',
          moveDown: 'Move Down',
          bringToFront: 'Bring to Front',
          sendToBack: 'Send to Back',
          preview: 'Preview',
          save: 'Save',
          undo: 'Undo',
          redo: 'Redo',
          export: 'Export',
          import: 'Import',
          clear: 'Clear',
          settings: 'Settings',
        },
        data: {
          dataSource: 'Data Source',
          addDataSource: 'Add Data Source',
          apiConfig: 'API Config',
          mockData: 'Mock Data',
          transform: 'Transform',
          refresh: 'Refresh',
          cache: 'Cache',
        },
        theme: {
          themeSettings: 'Theme Settings',
          preset: 'Preset',
          custom: 'Custom',
          resetTheme: 'Reset Theme',
          exportTheme: 'Export Theme',
          importTheme: 'Import Theme',
        },
      },
    });
  }

  /** 注册语言包 */
  registerLocale(config: LocaleConfig): void {
    this.locales.set(config.name, config);
  }

  /** 切换语言 */
  setLocale(locale: string): void {
    if (!this.locales.has(locale)) {
      console.warn(`[I18n] Locale "${locale}" not found`);
      return;
    }
    this.currentLocale = locale;
    this.onChange?.(locale);
  }

  /** 获取当前语言 */
  getLocale(): string {
    return this.currentLocale;
  }

  /** 获取所有语言 */
  getLocales(): Array<{ name: string; label: string }> {
    return Array.from(this.locales.values()).map((l) => ({ name: l.name, label: l.label }));
  }

  /** 翻译 */
  t(key: string, params?: Record<string, unknown>): string {
    const value = this.resolve(key, this.currentLocale)
      ?? this.resolve(key, this.fallbackLocale)
      ?? key;

    // 参数替换
    if (params && typeof value === 'string') {
      return value.replace(/\{\{(\w+)\}\}/g, (_, name) => {
        const val = params[name];
        return val != null ? String(val) : `{{${name}}}`;
      });
    }

    return typeof value === 'string' ? value : key;
  }

  /** 翻译对象 (用于批量) */
  tObj(prefix: string): Record<string, string> {
    const locale = this.locales.get(this.currentLocale);
    if (!locale) return {};
    const messages = locale.messages;
    const parts = prefix.split('.');
    let current: any = messages;
    for (const part of parts) {
      current = current?.[part];
    }
    if (typeof current === 'object') {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(current)) {
        result[k] = typeof v === 'string' ? v : k;
      }
      return result;
    }
    return {};
  }

  /** 解析嵌套 key */
  private resolve(key: string, locale: string): string | undefined {
    const config = this.locales.get(locale);
    if (!config) return undefined;

    const parts = key.split('.');
    let current: any = config.messages;
    for (const part of parts) {
      current = current?.[part];
      if (current === undefined) return undefined;
    }
    return typeof current === 'string' ? current : undefined;
  }

  /** 监听语言切换 */
  onChange_(callback: (locale: string) => void): void {
    this.onChange = callback;
  }

  /** 导出语言包 */
  exportLocale(locale: string): string {
    const config = this.locales.get(locale);
    return JSON.stringify(config, null, 2);
  }

  /** 导入语言包 */
  importLocale(json: string): void {
    const config: LocaleConfig = JSON.parse(json);
    this.registerLocale(config);
  }

  destroy(): void {
    this.locales.clear();
  }
}
