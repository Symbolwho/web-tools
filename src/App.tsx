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
import { toast } from "sonner"

import { JsonOutput } from "@/components/json-output"
import { SettingsSurface } from "@/components/settings-surface"
import { TimestampToolSurface } from "@/components/timestamp-tool-surface"
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
import { cn } from "@/lib/utils"

const SOURCE_KEY = "web-tools:source"
const HISTORY_KEY = "web-tools:history"
const RECORDS_KEY = "web-tools:records"
const RECORDS_SIDEBAR_KEY = "web-tools:records-sidebar-collapsed"
const MAX_HISTORY_ITEMS = 12
const MAX_RECORD_ITEMS = 20

type HistoryAction = "format" | "minify" | "unescape" | "escape" | "clear"
type ToolId = "json" | "timestamp"

const DEFAULT_TOOL: ToolId = "json"
const TOOL_HASH_ROUTES: Record<ToolId, string> = {
  json: "#/json",
  timestamp: "#/timestamp",
}

function isToolId(value: string): value is ToolId {
  return value === "json" || value === "timestamp"
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

function App() {
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
    } catch (err) {
      if (err instanceof Error) {
        setErrorKey(null)
        setErrorText(err.message)
      } else {
        setTranslatedError("errors.copyFailed")
      }
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-sm font-semibold shadow-sm">
              WT
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
                {displayedError ? (
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
                      <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
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
                            setSourceInlineHintKey(null)
                          }}
                          placeholder={sourceInlineHintKey ? t(sourceInlineHintKey) : t("placeholders.input")}
                          className="min-h-[20rem] flex-1 resize-none overflow-auto border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0"
                          spellCheck={false}
                        />
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
            ) : (
              <TimestampToolSurface />
            )}
          </div>
        </main>
      </div>
      <Toaster position="top-center" richColors={false} />
    </div>
  )
}

export default App
