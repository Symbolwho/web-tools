import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Locale = "zh-CN" | "en"

const LOCALE_STORAGE_KEY = "web-tools:locale"
const DEFAULT_LOCALE: Locale = "zh-CN"

const messages = {
  "zh-CN": {
    "app.badge": "Web Tools",
    "app.title": "格式化 JSON、转换时间戳，以及更多常用开发小工具。",
    "app.description": "一个本地优先的多工具工作台，支持 JSON 处理、时间戳转换和统一主题切换。",
    "tools.title": "工具站",
    "tools.description": "在不同工具之间切换，保持统一的交互体验。",
    "tools.json": "JSON",
    "tools.timestamp": "时间戳",
    "settings.open": "打开设置",
    "settings.title": "界面设置",
    "settings.description": "快速切换语言、显示模式和主题色。",
    "settings.language": "语言",
    "settings.displayMode": "显示模式",
    "settings.themeColor": "主题色",
    "theme.light": "浅色",
    "theme.dark": "深色",
    "theme.system": "系统",
    "theme.blue": "蓝色",
    "theme.zinc": "锌灰",
    "theme.green": "绿色",
    "theme.rose": "玫瑰",
    "actions.format": "格式化",
    "actions.unescape": "反转义",
    "actions.escape": "转义",
    "actions.minify": "压缩",
    "actions.save": "保存",
    "actions.copy": "复制",
    "actions.clear": "清空",
    "history.open": "打开历史",
    "history.title": "变换历史",
    "history.empty": "还没有历史记录",
    "history.restore": "恢复",
    "history.clear": "清空历史",
    "history.action.format": "格式化",
    "history.action.unescape": "反转义",
    "history.action.escape": "转义",
    "history.action.minify": "压缩",
    "history.action.clear": "清空",
    "history.previewEmpty": "空内容",
    "records.open": "打开记录",
    "records.title": "JSON 记录",
    "records.empty": "还没有保存的 JSON 记录",
    "records.restore": "恢复",
    "records.clear": "清空记录",
    "records.delete": "删除记录",
    "records.saved": "已保存",
    "records.previewEmpty": "空内容",
    "records.collapse": "折叠记录栏",
    "records.expand": "展开记录栏",
    "alert.invalidInput": "输入无效",
    "labels.source": "JSON 源文",
    "labels.jsonTree": "JSON 树",
    "labels.chars": "字符",
    "placeholders.input": '示例：{"a":1,"b":[true,false]} 或 "{\\"a\\":1}"',
    "placeholders.output": "合法 JSON 会在这里显示为树",
    "footer.persistence": "源文、历史记录和 JSON 记录会保存在你的浏览器本地。",
    "toast.copySuccess": "已复制源文内容",
    "toast.saveSuccess": "已保存到 JSON 记录",
    "errors.nothingToCopy": "没有可复制的内容",
    "errors.nothingToSave": "没有可保存的内容",
    "errors.copyFailed": "复制失败",
    "errors.inputEmpty": "输入为空",
    "errors.expectedJsonStringLiteral": "需要输入 JSON 字符串字面量（例如 \"{\\\"a\\\":1}\"）",
    "jsonOutput.expandNode": "展开节点",
    "jsonOutput.collapseNode": "折叠节点",
    "jsonOutput.objectKeys": " 个键",
    "jsonOutput.arrayItems": " 项",
    "timestamp.current.title": "当前时间戳",
    "timestamp.current.description": "实时查看当前时间戳，并在秒 / 毫秒之间切换。",
    "timestamp.mode.single": "单个转换",
    "timestamp.mode.batch": "批量转换",
    "timestamp.sections.timestampToDate": "时间戳转日期时间",
    "timestamp.sections.dateToTimestamp": "日期时间转时间戳",
    "timestamp.actions.toggleUnit": "切换单位",
    "timestamp.actions.start": "开始",
    "timestamp.actions.stop": "停止",
    "timestamp.actions.convert": "转换",
    "timestamp.actions.convertBatch": "批量转换",
    "timestamp.actions.copyResult": "复制结果",
    "timestamp.actions.copyBatch": "复制批量结果",
    "timestamp.unit.seconds": "秒(s)",
    "timestamp.unit.milliseconds": "毫秒(ms)",
    "timestamp.unit.secondsShort": "秒",
    "timestamp.unit.millisecondsShort": "毫秒",
    "timestamp.placeholders.timestamp": "输入时间戳",
    "timestamp.placeholders.dateTime": "例如 2026-03-19 15:51:51",
    "timestamp.placeholders.result": "转换结果",
    "timestamp.placeholders.batchTimestamp": "每行一个时间戳",
    "timestamp.placeholders.batchDateTime": "每行一个日期时间",
    "timestamp.batch.timestampToDate": "时间戳 → 日期",
    "timestamp.batch.dateToTimestamp": "日期 → 时间戳",
    "timestamp.batch.input": "批量输入",
    "timestamp.batch.output": "批量结果",
    "timestamp.batch.onePerLine": "每行一个值",
    "timestamp.batch.errorPrefix": "错误：",
    "timestamp.toast.copyCurrent": "已复制当前时间戳",
    "timestamp.toast.copyResult": "已复制转换结果",
    "timestamp.toast.copyBatch": "已复制批量结果",
    "timestamp.errors.emptyTimestamp": "请输入时间戳",
    "timestamp.errors.invalidTimestamp": "时间戳格式无效",
    "timestamp.errors.emptyDateTime": "请输入日期时间",
    "timestamp.errors.invalidDateTime": "日期时间格式无效，请使用 YYYY-MM-DD HH:mm:ss",
    "timestamp.errors.invalidTimezone": "时区无效",
    "timestamp.errors.emptyBatch": "请先输入批量转换内容",
    "locale.zh-CN": "中文",
    "locale.en": "EN",
  },
  en: {
    "app.badge": "Web Tools",
    "app.title": "Format JSON, convert timestamps, and use more everyday developer utilities.",
    "app.description": "A local-first multi-tool workspace with JSON processing, timestamp conversion, and shared theming.",
    "tools.title": "Tool Station",
    "tools.description": "Switch between tools while keeping a consistent interaction style.",
    "tools.json": "JSON",
    "tools.timestamp": "Timestamp",
    "settings.open": "Open settings",
    "settings.title": "Interface settings",
    "settings.description": "Quickly switch language, display mode, and theme color.",
    "settings.language": "Language",
    "settings.displayMode": "Display mode",
    "settings.themeColor": "Theme color",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "System",
    "theme.blue": "Blue",
    "theme.zinc": "Zinc",
    "theme.green": "Green",
    "theme.rose": "Rose",
    "actions.format": "Format",
    "actions.unescape": "Unescape",
    "actions.escape": "Escape",
    "actions.minify": "Minify",
    "actions.save": "Save",
    "actions.copy": "Copy",
    "actions.clear": "Clear",
    "history.open": "Open history",
    "history.title": "Transform history",
    "history.empty": "No history yet",
    "history.restore": "Restore",
    "history.clear": "Clear history",
    "history.action.format": "Format",
    "history.action.unescape": "Unescape",
    "history.action.escape": "Escape",
    "history.action.minify": "Minify",
    "history.action.clear": "Clear",
    "history.previewEmpty": "Empty content",
    "records.open": "Open records",
    "records.title": "JSON Records",
    "records.empty": "No saved JSON records yet",
    "records.restore": "Restore",
    "records.clear": "Clear records",
    "records.delete": "Delete record",
    "records.saved": "Saved",
    "records.previewEmpty": "Empty content",
    "records.collapse": "Collapse records sidebar",
    "records.expand": "Expand records sidebar",
    "alert.invalidInput": "Invalid input",
    "labels.source": "JSON Source",
    "labels.jsonTree": "JSON Tree",
    "labels.chars": "chars",
    "placeholders.input": 'Example: {"a":1,"b":[true,false]} or "{\\"a\\":1}"',
    "placeholders.output": "Valid JSON will appear here as a tree",
    "footer.persistence": "Source text, history, and JSON records are saved locally in your browser.",
    "toast.copySuccess": "Copied source text",
    "toast.saveSuccess": "Saved to JSON records",
    "errors.nothingToCopy": "Nothing to copy",
    "errors.nothingToSave": "Nothing to save",
    "errors.copyFailed": "Failed to copy",
    "errors.inputEmpty": "Input is empty",
    "errors.expectedJsonStringLiteral": "Expected a JSON string literal (e.g. \"{\\\"a\\\":1}\")",
    "jsonOutput.expandNode": "Expand node",
    "jsonOutput.collapseNode": "Collapse node",
    "jsonOutput.objectKeys": "keys",
    "jsonOutput.arrayItems": "items",
    "timestamp.current.title": "Current timestamp",
    "timestamp.current.description": "Watch the live timestamp and switch between seconds and milliseconds.",
    "timestamp.mode.single": "Single",
    "timestamp.mode.batch": "Batch",
    "timestamp.sections.timestampToDate": "Timestamp to date/time",
    "timestamp.sections.dateToTimestamp": "Date/time to timestamp",
    "timestamp.actions.toggleUnit": "Toggle unit",
    "timestamp.actions.start": "Start",
    "timestamp.actions.stop": "Stop",
    "timestamp.actions.convert": "Convert",
    "timestamp.actions.convertBatch": "Convert batch",
    "timestamp.actions.copyResult": "Copy result",
    "timestamp.actions.copyBatch": "Copy batch result",
    "timestamp.unit.seconds": "Seconds (s)",
    "timestamp.unit.milliseconds": "Milliseconds (ms)",
    "timestamp.unit.secondsShort": "s",
    "timestamp.unit.millisecondsShort": "ms",
    "timestamp.placeholders.timestamp": "Enter timestamp",
    "timestamp.placeholders.dateTime": "For example 2026-03-19 15:51:51",
    "timestamp.placeholders.result": "Conversion result",
    "timestamp.placeholders.batchTimestamp": "One timestamp per line",
    "timestamp.placeholders.batchDateTime": "One date/time per line",
    "timestamp.batch.timestampToDate": "Timestamp → Date",
    "timestamp.batch.dateToTimestamp": "Date → Timestamp",
    "timestamp.batch.input": "Batch input",
    "timestamp.batch.output": "Batch result",
    "timestamp.batch.onePerLine": "One value per line",
    "timestamp.batch.errorPrefix": "Error:",
    "timestamp.toast.copyCurrent": "Copied current timestamp",
    "timestamp.toast.copyResult": "Copied conversion result",
    "timestamp.toast.copyBatch": "Copied batch result",
    "timestamp.errors.emptyTimestamp": "Enter a timestamp",
    "timestamp.errors.invalidTimestamp": "Invalid timestamp format",
    "timestamp.errors.emptyDateTime": "Enter a date/time value",
    "timestamp.errors.invalidDateTime": "Invalid date/time format. Use YYYY-MM-DD HH:mm:ss",
    "timestamp.errors.invalidTimezone": "Invalid timezone",
    "timestamp.errors.emptyBatch": "Enter batch conversion input first",
    "locale.zh-CN": "中文",
    "locale.en": "EN",
  },
} as const

export type MessageKey = keyof (typeof messages)["zh-CN"]

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function isLocale(value: string | null): value is Locale {
  return value === "zh-CN" || value === "en"
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return isLocale(stored) ? stored : DEFAULT_LOCALE
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => messages[locale][key],
    }),
    [locale],
  )

  return createElement(I18nContext.Provider, { value }, children)
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider")
  }

  return context
}
