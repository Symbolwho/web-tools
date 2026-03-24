import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  History,
  Minimize2,
  Redo2,
  Settings2,
  Sparkles,
  Trash2,
  Wand2,
  WrapText,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { JsonOutput } from "@/components/json-output"
import { JwtToolSurface } from "@/components/jwt-tool-surface"
import { InlineFieldError } from "@/components/inline-field-error"
import { SettingsSurface } from "@/components/settings-surface"
import { TimestampToolSurface } from "@/components/timestamp-tool-surface"
import { ToolboxLogo } from "@/components/toolbox-logo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { Textarea } from "@/components/ui/textarea"
import { useI18n, type MessageKey } from "@/lib/i18n"
import {
  escapeJsonString,
  formatJson,
  minifyJson,
  parseJsonValue,
  unescapeJsonString,
  type JsonToolResult,
} from "@/lib/json-tools"
import { useThemeColor } from "@/lib/theme"
import { cn } from "@/lib/utils"

const DYNAMIC_FAVICON_ID = "app-favicon"

function createToolboxFaviconSvg(primaryColor: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none"><path d="M344.792 518.575L303.4 477.184a26.947 26.947 0 0 1 38.13-38.13l60.174 60.173a26.947 26.947 0 0 1 0.27 37.834L114.392 833.16a26.947 26.947 0 0 0 0.27 37.834l68.984 68.958a26.947 26.947 0 0 0 38.077 0l291.301-291.3a26.947 26.947 0 0 1 38.104 0l146.324 146.323a26.947 26.947 0 1 1-38.104 38.13L532.076 705.833 259.853 978.055a80.842 80.842 0 0 1-114.337 0L76.53 909.096a80.842 80.842 0 0 1-0.809-113.475l269.043-277.046z m473.546 155.54a26.947 26.947 0 1 1-38.104 38.104L597.288 529.273a26.947 26.947 0 0 1 0-38.103l148.13-148.103a26.947 26.947 0 0 1 15.36-7.653l88.603-12.18 89.627-170.927-56.697-60.39-167.37 97.254-16.546 85.53a26.947 26.947 0 0 1-7.384 13.96l-148.13 148.102a26.947 26.947 0 0 1-38.103 0l-77.474-77.474a26.947 26.947 0 1 1 38.104-38.103l58.422 58.422 123.23-123.23 17.273-89.466a26.947 26.947 0 0 1 12.935-18.19l196.5-114.175a26.947 26.947 0 0 1 33.173 4.85l84.48 90.004a26.947 26.947 0 0 1 4.203 30.963l-104.96 200.165a26.947 26.947 0 0 1-20.21 14.201l-93.346 12.854-122.637 122.637 163.867 163.894z" fill="${primaryColor}"/><path d="M610.816 784.573a26.947 26.947 0 0 1 38.104-38.104l52.089 52.09a26.947 26.947 0 0 1-38.104 38.103l-52.089-52.09zM368.371 543.42a26.947 26.947 0 1 1 37.995-38.185L705.671 803.22a26.947 26.947 0 0 1 7.814 21.45 111.373 111.373 0 0 0 31.475 87.471 107.79 107.79 0 1 0 68.662-183.727c-2.129 0.135-3.934 0.081-5.578-0.054a26.947 26.947 0 0 1-19.537-7.868L485.24 417.954a26.947 26.947 0 1 1 38.05-38.158l295.181 294.481A161.684 161.684 0 1 1 706.83 950.272a165.16 165.16 0 0 1-47.642-117.275L368.37 543.421z" fill="${primaryColor}"/><path d="M783.076 874.036a53.895 53.895 0 1 0 76.22-76.219 53.895 53.895 0 1 0-76.22 76.219zM421.807 588.989a26.947 26.947 0 0 1 38.104 38.13L221.723 865.28a26.947 26.947 0 1 1-38.104-38.104L421.807 588.99z m81.597-229.808a26.947 26.947 0 1 1-38.104 38.104l-37.996-37.996a26.947 26.947 0 0 1-5.847-29.345c0.808-1.914 1.05-2.426 3.368-7.06l0.189-0.432c0.754-1.509 1.24-2.506 1.159-2.263a188.632 188.632 0 0 0-43.601-198.818 187.877 187.877 0 0 0-129.698-55.215 189.736 189.736 0 0 0-73.135 13.15l-2.506 0.97-1.752 0.728a26.947 26.947 0 0 1-21.073-49.61c1.887-0.809 1.887-0.809 3.423-1.402l2.102-0.808a242.068 242.068 0 0 1 93.992-16.896 241.772 241.772 0 0 1 166.723 70.98 242.526 242.526 0 0 1 57.722 250.88l25.007 25.033zM25.869 160.013a26.947 26.947 0 0 1 49.61 21.02 187.284 187.284 0 0 0-14.74 65.374 188.039 188.039 0 0 0 55.054 141.743 188.632 188.632 0 0 0 44.463 33.037 26.947 26.947 0 1 1-25.411 47.536 242.526 242.526 0 0 1-57.129-42.47A241.907 241.907 0 0 1 6.9 244.035a243.443 243.443 0 0 1 18.97-84.022z m224.337 337.274a26.947 26.947 0 0 1-0.215-53.895 189.17 189.17 0 0 0 61.79-10.644c4.366-1.51 7.168-2.21 10.94-1.563a26.947 26.947 0 0 1 18.81 7.895l33.145 33.146a26.947 26.947 0 0 1-38.103 38.13l-21.99-22.016a243.308 243.308 0 0 1-64.377 8.947z" fill="${primaryColor}"/><path d="M148.48 77.824a26.947 26.947 0 1 1 38.104-38.104l161.792 161.82a26.947 26.947 0 0 1 7.087 25.6l-22.986 91.35a26.947 26.947 0 0 1-19.564 19.565L221.56 361.04a26.947 26.947 0 0 1-25.6-7.06L30.343 188.362a26.947 26.947 0 1 1 38.13-38.103L223.26 305.044l60.901-15.306 15.306-60.9L148.48 77.823z" fill="${primaryColor}"/></svg>`
}

function createFaviconDataUrl(primaryColor: string) {
  return `data:image/svg+xml,${encodeURIComponent(createToolboxFaviconSvg(primaryColor))}`
}

function getPrimaryColorValue() {
  const rootStyles = getComputedStyle(document.documentElement)
  const primaryValue = rootStyles.getPropertyValue("--primary").trim()

  if (!primaryValue) {
    return "oklch(0.623 0.214 259.815)"
  }

  return primaryValue.startsWith("oklch(") ? primaryValue : `oklch(${primaryValue})`
}

function getOrCreateFaviconLink() {
  const existingLink = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (existingLink) {
    existingLink.id = DYNAMIC_FAVICON_ID
    return existingLink
  }

  const faviconLink = document.createElement("link")
  faviconLink.id = DYNAMIC_FAVICON_ID
  faviconLink.rel = "icon"
  faviconLink.type = "image/svg+xml"
  document.head.appendChild(faviconLink)
  return faviconLink
}

function syncFavicon() {
  const faviconLink = getOrCreateFaviconLink()
  faviconLink.href = createFaviconDataUrl(getPrimaryColorValue())
}

const SOURCE_KEY = "web-tools:source"
const HISTORY_KEY = "web-tools:history"
const RECORDS_KEY = "web-tools:records"
const RECORDS_SIDEBAR_KEY = "web-tools:records-sidebar-collapsed"
const MAX_HISTORY_ITEMS = 12
const MAX_RECORD_ITEMS = 20

type HistoryAction = "format" | "minify" | "unescape" | "escape" | "clear"
type ToolId = "json" | "timestamp" | "jwt"

const DEFAULT_TOOL: ToolId = "json"
const TOOL_HASH_ROUTES: Record<ToolId, string> = {
  json: "#/json",
  timestamp: "#/timestamp",
  jwt: "#/jwt",
}

function isToolId(value: string): value is ToolId {
  return value === "json" || value === "timestamp" || value === "jwt"
}

function getToolFromHash(hash: string): ToolId {
  const matchedEntry = Object.entries(TOOL_HASH_ROUTES).find(([, route]) => route === hash)
  return matchedEntry && isToolId(matchedEntry[0]) ? matchedEntry[0] : DEFAULT_TOOL
}

function syncHashForTool(tool: ToolId, replace = false) {
  if (typeof window === "undefined") {
    return
  }

  const nextHash = TOOL_HASH_ROUTES[tool]
  if (window.location.hash === nextHash) {
    return
  }

  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`

  if (replace) {
    window.history.replaceState(null, "", nextUrl)
    return
  }

  window.location.hash = nextHash
}

function getInitialTool() {
  if (typeof window === "undefined") {
    return DEFAULT_TOOL
  }

  return getToolFromHash(window.location.hash)
}

function selectTool(tool: ToolId) {
  syncHashForTool(tool)
}

function replaceTool(tool: ToolId) {
  syncHashForTool(tool, true)
}

const HISTORY_ACTION_LABELS: Record<HistoryAction, MessageKey> = {
  format: "history.action.format",
  minify: "history.action.minify",
  unescape: "history.action.unescape",
  escape: "history.action.escape",
  clear: "history.action.clear",
}

type SnapshotItem = {
  id: string
  value: string
  createdAt: string
}

type HistoryItem = SnapshotItem & {
  action: HistoryAction
}

type RecordItem = SnapshotItem

function getStorageItems<T>(storageKey: string, isValidItem: (value: unknown) => value is T): T[] {
  if (typeof window === "undefined") {
    return []
  }

  const stored = window.localStorage.getItem(storageKey)
  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isValidItem)
  } catch {
    return []
  }
}

function isSnapshotItem(item: unknown): item is SnapshotItem {
  return (
    !!item &&
    typeof item === "object" &&
    typeof (item as SnapshotItem).id === "string" &&
    typeof (item as SnapshotItem).value === "string" &&
    typeof (item as SnapshotItem).createdAt === "string"
  )
}

function isHistoryItem(item: unknown): item is HistoryItem {
  return isSnapshotItem(item) && typeof (item as HistoryItem).action === "string"
}

function getInitialHistory() {
  return getStorageItems(HISTORY_KEY, isHistoryItem)
}

function getInitialRecords() {
  return getStorageItems(RECORDS_KEY, isSnapshotItem)
}

function getInitialRecordsSidebarCollapsed() {
  if (typeof window === "undefined") {
    return false
  }

  return window.localStorage.getItem(RECORDS_SIDEBAR_KEY) === "true"
}

function createSnapshot(value: string): SnapshotItem {
  return {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    value,
    createdAt: new Date().toISOString(),
  }
}

function isJsonSourceErrorKey(
  key: MessageKey | null,
): key is "errors.inputEmpty" | "errors.expectedJsonStringLiteral" | "errors.nothingToSave" {
  return key === "errors.inputEmpty" || key === "errors.expectedJsonStringLiteral" || key === "errors.nothingToSave"
}

function App() {
  const { resolvedTheme } = useTheme()
  const { colorTheme } = useThemeColor()
  const { locale, t } = useI18n()
  const [selectedTool, setSelectedTool] = useState<ToolId>(getInitialTool)
  const [source, setSource] = useState(() => {
    if (typeof window === "undefined") {
      return ""
    }

    return window.localStorage.getItem(SOURCE_KEY) ?? ""
  })
  const [history, setHistory] = useState<HistoryItem[]>(getInitialHistory)
  const [records, setRecords] = useState<RecordItem[]>(getInitialRecords)
  const [isRecordsSidebarCollapsed, setIsRecordsSidebarCollapsed] = useState(getInitialRecordsSidebarCollapsed)
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null)
  const [errorText, setErrorText] = useState("")
  const [sourceInlineHintKey, setSourceInlineHintKey] = useState<MessageKey | null>(null)

  useEffect(() => {
    localStorage.setItem(SOURCE_KEY, source)
  }, [source])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    replaceTool(selectedTool)

    const handleHashChange = () => {
      setSelectedTool(getToolFromHash(window.location.hash))
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [selectedTool])

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }, [history])

  useEffect(() => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  }, [records])

  useEffect(() => {
    localStorage.setItem(RECORDS_SIDEBAR_KEY, isRecordsSidebarCollapsed ? "true" : "false")
  }, [isRecordsSidebarCollapsed])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      syncFavicon()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [resolvedTheme, colorTheme])

  const parsedSource = useMemo(() => parseJsonValue(source), [source])

  const stats = useMemo(() => {
    return {
      sourceChars: source.length,
      treeChars: parsedSource.ok ? source.length : 0,
    }
  }, [parsedSource.ok, source.length])

  function clearError() {
    setErrorKey(null)
    setErrorText("")
    setSourceInlineHintKey(null)
  }

  function setTranslatedError(key: MessageKey) {
    setErrorKey(key)
    setErrorText("")
  }

  function pushHistory(action: HistoryAction, value: string) {
    setHistory((current) => [{ ...createSnapshot(value), action }, ...current].slice(0, MAX_HISTORY_ITEMS))
  }

  function restoreSource(value: string) {
    setSource(value)
    clearError()
  }

  function saveRecord() {
    if (!source.trim()) {
      setTranslatedError("errors.nothingToSave")
      return
    }

    setRecords((current) => [createSnapshot(source), ...current].slice(0, MAX_RECORD_ITEMS))
    toast.success(t("toast.saveSuccess"))
    clearError()
  }

  function clearRecords() {
    setRecords([])
    localStorage.removeItem(RECORDS_KEY)
  }

  function deleteRecord(recordId: string) {
    setRecords((current) => current.filter((item) => item.id !== recordId))
  }

  function applyResultToSource(action: Exclude<HistoryAction, "clear">, result: JsonToolResult) {
    if (result.ok) {
      pushHistory(action, source)
      setSource(result.value)
      clearError()
      return
    }

    if ("errorKey" in result) {
      setTranslatedError(result.errorKey)
    } else {
      setErrorKey(null)
      setErrorText(result.error)
    }
  }

  function handleFormat() {
    applyResultToSource("format", formatJson(source))
  }

  function handleMinify() {
    applyResultToSource("minify", minifyJson(source))
  }

  function handleUnescape() {
    applyResultToSource("unescape", unescapeJsonString(source))
  }

  function handleEscape() {
    applyResultToSource("escape", escapeJsonString(source))
  }

  async function handleCopy() {
    if (!source.trim()) {
      setSourceInlineHintKey("errors.nothingToCopy")
      return
    }

    try {
      await navigator.clipboard.writeText(source)
      toast.success(t("toast.copySuccess"))
      clearError()
    } catch {
      toast.error(t("errors.copyFailed"))
    }
  }

  function handleClear() {
    if (source.length > 0) {
      pushHistory("clear", source)
    }

    setSource("")
    clearError()
    localStorage.removeItem(SOURCE_KEY)
  }

  function handleClearHistory() {
    setHistory([])
    localStorage.removeItem(HISTORY_KEY)
  }

  function formatItemTime(createdAt: string) {
    return new Intl.DateTimeFormat(locale, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(createdAt))
  }

  const displayedError = errorKey ? t(errorKey) : errorText
  const jsonTreeValue = parsedSource.ok ? source : ""
  const recordsSidebarLabel = t(isRecordsSidebarCollapsed ? "records.expand" : "records.collapse")
  const sourceInlineErrorMessage = sourceInlineHintKey
    ? t(sourceInlineHintKey)
    : isJsonSourceErrorKey(errorKey)
      ? t(errorKey)
      : errorText
  const hasSourceInlineError = Boolean(sourceInlineErrorMessage)
  const hasJsonTopLevelError = !hasSourceInlineError && Boolean(displayedError)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-primary shadow-sm">
              <ToolboxLogo className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t("app.badge")}</p>
              <p className="truncate text-xs text-muted-foreground">{t("tools.title")}</p>
            </div>
            <div
              data-slot="button-group"
              className="inline-flex w-full rounded-xl border border-border/70 bg-muted/35 p-1 sm:w-auto"
            >
              {([
                ["json", "tools.json"],
                ["timestamp", "tools.timestamp"],
                ["jwt", "tools.jwt"],
              ] as const).map(([value, labelKey]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={selectedTool === value ? "default" : "ghost"}
                  className="min-w-0 flex-1 rounded-lg sm:flex-none"
                  onClick={() => selectTool(value)}
                >
                  {t(labelKey)}
                </Button>
              ))}
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="ml-auto shrink-0 rounded-full border-border/70 bg-background/80 shadow-sm backdrop-blur"
                aria-label={t("settings.open")}
                title={t("settings.open")}
              >
                <Settings2 className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end">
              <SettingsSurface />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {selectedTool === "json" ? (
          <aside
            className={cn(
              "min-h-0 shrink-0 border-r border-border/70 bg-card/85 backdrop-blur transition-[width] duration-200 ease-out supports-[backdrop-filter]:bg-card/70",
              isRecordsSidebarCollapsed ? "w-16" : "w-72 sm:w-80",
            )}
          >
            <div
              className={cn(
                "flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3",
                isRecordsSidebarCollapsed && "items-center px-2 py-3",
              )}
            >
              {isRecordsSidebarCollapsed ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl border-border/70 bg-background/80 shadow-sm"
                    aria-label={recordsSidebarLabel}
                    title={recordsSidebarLabel}
                    onClick={() => setIsRecordsSidebarCollapsed(false)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <div className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background/80 shadow-sm">
                    <Bookmark className="size-4 text-muted-foreground" />
                  </div>
                  <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {records.length}
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/80 shadow-sm">
                        <Bookmark className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-sm font-semibold">{t("records.title")}</h2>
                        <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {records.length}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 rounded-xl border-border/70 bg-background/80 shadow-sm"
                      aria-label={recordsSidebarLabel}
                      title={recordsSidebarLabel}
                      onClick={() => setIsRecordsSidebarCollapsed(true)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="justify-start"
                    onClick={clearRecords}
                    disabled={records.length === 0}
                  >
                    {t("records.clear")}
                  </Button>

                  {records.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                      {t("records.empty")}
                    </div>
                  ) : (
                    <div className="records-list space-y-2 pr-1">
                      {records.map((item) => {
                        const preview = item.value.trim() || t("records.previewEmpty")

                        return (
                          <div
                            key={item.id}
                            className="history-item space-y-3 rounded-xl border border-border/60 bg-background/75 p-3"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="history-item-action">{t("records.saved")}</span>
                                  <span>{formatItemTime(item.createdAt)}</span>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-muted-foreground hover:text-primary"
                                    aria-label={t("records.restore")}
                                    title={t("records.restore")}
                                    onClick={() => restoreSource(item.value)}
                                  >
                                    <Redo2 className="size-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-muted-foreground hover:text-destructive"
                                    aria-label={t("records.delete")}
                                    title={t("records.delete")}
                                    onClick={() => deleteRecord(item.id)}
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              </div>
                              <p className="history-item-preview text-sm">{preview}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        ) : null}

        <main className="min-w-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 w-full flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            {selectedTool === "json" ? (
              <>
                {hasJsonTopLevelError ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>{t("alert.invalidInput")}</AlertTitle>
                    <AlertDescription>{displayedError}</AlertDescription>
                  </Alert>
                ) : null}

                <Card className="flex min-h-0 flex-1 flex-col border-border/70 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                  <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
                    <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/35 p-3">
                      <Button onClick={handleFormat} className="gap-2 shadow-sm">
                        <Sparkles className="size-4" />
                        {t("actions.format")}
                      </Button>
                      <Button onClick={handleUnescape} variant="outline" className="gap-2 bg-background/70">
                        <Wand2 className="size-4" />
                        {t("actions.unescape")}
                      </Button>
                      <Button onClick={handleEscape} variant="outline" className="gap-2 bg-background/70">
                        <WrapText className="size-4" />
                        {t("actions.escape")}
                      </Button>
                      <Button onClick={handleMinify} variant="outline" className="gap-2 bg-background/70">
                        <Minimize2 className="size-4" />
                        {t("actions.minify")}
                      </Button>
                      <Separator orientation="vertical" className="hidden h-8 sm:block" />
                      <Button onClick={saveRecord} variant="secondary" className="gap-2">
                        <Bookmark className="size-4" />
                        {t("actions.save")}
                      </Button>
                      <Button onClick={handleCopy} variant="secondary" className="gap-2">
                        <Copy className="size-4" />
                        {t("actions.copy")}
                      </Button>
                      <Button onClick={handleClear} variant="ghost" className="gap-2">
                        <Eraser className="size-4" />
                        {t("actions.clear")}
                      </Button>
                    </div>

                    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
                      <section
                        className={cn(
                          "flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm",
                          hasSourceInlineError && "border-destructive/60",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Label htmlFor="json-source">{t("labels.source")}</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  className="shrink-0"
                                  aria-label={t("history.open")}
                                  title={t("history.open")}
                                >
                                  <History className="size-3.5" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-[min(26rem,calc(100vw-1rem))] p-3">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-sm font-semibold">{t("history.title")}</h2>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="xs"
                                      onClick={handleClearHistory}
                                      disabled={history.length === 0}
                                    >
                                      {t("history.clear")}
                                    </Button>
                                  </div>

                                  {history.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                                      {t("history.empty")}
                                    </div>
                                  ) : (
                                    <div className="history-list space-y-2">
                                      {history.map((item) => {
                                        const preview = item.value.trim() || t("history.previewEmpty")

                                        return (
                                          <div
                                            key={item.id}
                                            className="history-item flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2"
                                          >
                                            <div className="min-w-0 flex-1 space-y-1">
                                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                <span className="history-item-action">{t(HISTORY_ACTION_LABELS[item.action])}</span>
                                                <span>{formatItemTime(item.createdAt)}</span>
                                              </div>
                                              <p className="history-item-preview text-sm">{preview}</p>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="xs"
                                              className="shrink-0 gap-1"
                                              onClick={() => restoreSource(item.value)}
                                            >
                                              <Redo2 className="size-3" />
                                              {t("history.restore")}
                                            </Button>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {stats.sourceChars} {t("labels.chars")}
                          </span>
                        </div>
                        <Textarea
                          id="json-source"
                          value={source}
                          onChange={(event) => {
                            setSource(event.target.value)
                            clearError()
                          }}
                          placeholder={t("placeholders.input")}
                          aria-invalid={hasSourceInlineError}
                          aria-describedby={hasSourceInlineError ? "json-source-error" : undefined}
                          className="min-h-[20rem] flex-1 resize-none overflow-auto border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0"
                          spellCheck={false}
                        />
                        {hasSourceInlineError ? <InlineFieldError id="json-source-error" message={sourceInlineErrorMessage} /> : null}
                      </section>

                      <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <Label id="json-tree-label" htmlFor="json-tree">
                            {t("labels.jsonTree")}
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            {stats.treeChars} {t("labels.chars")}
                          </span>
                        </div>
                        <JsonOutput
                          key={jsonTreeValue}
                          id="json-tree"
                          value={jsonTreeValue}
                          aria-labelledby="json-tree-label"
                          placeholder={t("placeholders.output")}
                          className="min-h-[20rem] flex-1 xl:min-h-0"
                        />
                      </section>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : selectedTool === "timestamp" ? (
              <TimestampToolSurface />
            ) : (
              <JwtToolSurface />
            )}
          </div>
        </main>
      </div>
      <Toaster position="top-center" richColors={false} />
    </div>
  )
}

export default App
