import {
  Clock3,
  Copy,
  Play,
  RefreshCcw,
  Square,
  WandSparkles,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useI18n, type MessageKey } from "@/lib/i18n"
import {
  convertBatchValues,
  convertDateToTimestamp,
  convertTimestampToDate,
  formatTimestampForDisplay,
  getCurrentTimestampValue,
  getDefaultTimeZone,
  getSupportedTimeZones,
  type TimestampDirection,
  type TimestampMode,
  type TimestampUnit,
} from "@/lib/timestamp-tools"
import { cn } from "@/lib/utils"

const LIVE_TIMER_INTERVAL = 1000

function getInitialTimeZone() {
  if (typeof window === "undefined") {
    return "UTC"
  }

  return getDefaultTimeZone()
}

function getDefaultDateTimeInput(timeZone: string) {
  return formatTimestampForDisplay(Date.now(), timeZone)
}

export function TimestampToolSurface() {
  const { locale, t } = useI18n()
  const [currentUnit, setCurrentUnit] = useState<TimestampUnit>("seconds")
  const [isLive, setIsLive] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const [mode, setMode] = useState<TimestampMode>("single")
  const [singleTimeZone, setSingleTimeZone] = useState(getInitialTimeZone)
  const [batchTimeZone, setBatchTimeZone] = useState(getInitialTimeZone)
  const [singleTimestampUnit, setSingleTimestampUnit] = useState<TimestampUnit>("milliseconds")
  const [singleDateResultUnit, setSingleDateResultUnit] = useState<TimestampUnit>("seconds")
  const [batchDirection, setBatchDirection] = useState<TimestampDirection>("timestamp-to-date")
  const [batchUnit, setBatchUnit] = useState<TimestampUnit>("milliseconds")
  const [timestampInput, setTimestampInput] = useState(() => String(Date.now()))
  const [dateTimeInput, setDateTimeInput] = useState(() => getDefaultDateTimeInput(getInitialTimeZone()))
  const [timestampToDateResult, setTimestampToDateResult] = useState("")
  const [dateToTimestampResult, setDateToTimestampResult] = useState("")
  const [singleErrorKey, setSingleErrorKey] = useState<MessageKey | null>(null)
  const [singleResultHintKey, setSingleResultHintKey] = useState<MessageKey | null>(null)
  const [singleResultHintTarget, setSingleResultHintTarget] = useState<"timestamp-to-date" | "date-to-timestamp" | null>(null)
  const [batchInput, setBatchInput] = useState("")
  const [batchResult, setBatchResult] = useState("")
  const [batchErrorKey, setBatchErrorKey] = useState<MessageKey | null>(null)
  const [batchResultHintKey, setBatchResultHintKey] = useState<MessageKey | null>(null)

  const supportedTimeZones = useMemo(() => getSupportedTimeZones(), [])
  const liveTimestamp = getCurrentTimestampValue(now, currentUnit)
  const currentAlert = singleErrorKey ? t(singleErrorKey) : null
  const batchAlert = batchErrorKey ? t(batchErrorKey) : null

  useEffect(() => {
    if (!isLive) {
      return
    }

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, LIVE_TIMER_INTERVAL)

    return () => window.clearInterval(timer)
  }, [isLive])

  async function copyText(
    value: string,
    successKey: MessageKey,
    setError: (key: MessageKey | null) => void,
    setInlineHint?: (key: MessageKey | null) => void,
  ) {
    if (!value.trim()) {
      setInlineHint?.("errors.nothingToCopy")
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      toast.success(t(successKey))
      setError(null)
      setInlineHint?.(null)
    } catch {
      setError("errors.copyFailed")
    }
  }

  function handleTimestampToDate() {
    const result = convertTimestampToDate(timestampInput, singleTimestampUnit, locale, singleTimeZone)

    if (result.ok) {
      setTimestampToDateResult(result.value)
      setSingleErrorKey(null)
      setSingleResultHintKey(null)
      setSingleResultHintTarget(null)
      return
    }

    setSingleErrorKey(result.errorKey)
    setTimestampToDateResult("")
  }

  function handleDateToTimestamp() {
    const result = convertDateToTimestamp(dateTimeInput, singleDateResultUnit, singleTimeZone)

    if (result.ok) {
      setDateToTimestampResult(result.value)
      setSingleErrorKey(null)
      setSingleResultHintKey(null)
      setSingleResultHintTarget(null)
      return
    }

    setSingleErrorKey(result.errorKey)
    setDateToTimestampResult("")
  }

  function handleConvertBatch() {
    const result = convertBatchValues(batchInput, batchDirection, batchUnit, locale, batchTimeZone)

    if (!result.ok) {
      setBatchErrorKey(result.errorKey)
      setBatchResult("")
      setBatchResultHintKey(null)
      return
    }

    setBatchResult(
      result.value
        .map((item) => (item.ok ? item.value : `${t("timestamp.batch.errorPrefix")} ${t(item.errorKey)}`))
        .join("\n"),
    )
    setBatchErrorKey(null)
    setBatchResultHintKey(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="border-border/70 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{t("timestamp.current.title")}</p>
            <p className="text-xs text-muted-foreground">{t("timestamp.current.description")}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <span className="font-mono text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {liveTimestamp}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">
              {t(currentUnit === "seconds" ? "timestamp.unit.secondsShort" : "timestamp.unit.millisecondsShort")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/35 p-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2 bg-background/70"
              onClick={() => setCurrentUnit((value) => (value === "seconds" ? "milliseconds" : "seconds"))}
            >
              <RefreshCcw className="size-4" />
              {t("timestamp.actions.toggleUnit")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => copyText(liveTimestamp, "timestamp.toast.copyCurrent", setSingleErrorKey)}
            >
              <Copy className="size-4" />
              {t("actions.copy")}
            </Button>
            <Button
              type="button"
              variant={isLive ? "destructive" : "default"}
              className="gap-2"
              onClick={() => {
                setIsLive((value) => !value)
                setNow(Date.now())
              }}
            >
              {isLive ? <Square className="size-4" /> : <Play className="size-4" />}
              {t(isLive ? "timestamp.actions.stop" : "timestamp.actions.start")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col border-border/70 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
          <div
            data-slot="button-group"
            className="inline-flex w-full rounded-xl border border-border/70 bg-muted/35 p-1"
          >
            {([
              ["single", "timestamp.mode.single"],
              ["batch", "timestamp.mode.batch"],
            ] as const).map(([value, labelKey]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={mode === value ? "default" : "ghost"}
                className="min-w-0 flex-1 rounded-lg"
                onClick={() => setMode(value)}
              >
                {t(labelKey)}
              </Button>
            ))}
          </div>

          {mode === "single" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              {currentAlert ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("alert.invalidInput")}</AlertTitle>
                  <AlertDescription>{currentAlert}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-4 rounded-xl border border-border/60 bg-background/65 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock3 className="size-4 text-muted-foreground" />
                  <span>{t("timestamp.sections.timestampToDate")}</span>
                </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_8rem_auto_minmax(0,1.25fr)_auto_12rem]">
                  <input
                    value={timestampInput}
                    onChange={(event) => {
                      setTimestampInput(event.target.value)
                      if (singleResultHintTarget === "timestamp-to-date") {
                        setSingleResultHintKey(null)
                      }
                    }}
                    placeholder={t("timestamp.placeholders.timestamp")}
                    className="timestamp-input"
                    spellCheck={false}
                  />
                  <select
                    value={singleTimestampUnit}
                    onChange={(event) => setSingleTimestampUnit(event.target.value as TimestampUnit)}
                    className="timestamp-select"
                  >
                    <option value="milliseconds">{t("timestamp.unit.milliseconds")}</option>
                    <option value="seconds">{t("timestamp.unit.seconds")}</option>
                  </select>
                  <Button type="button" className="gap-2" onClick={handleTimestampToDate}>
                    <WandSparkles className="size-4" />
                    {t("timestamp.actions.convert")}
                  </Button>
                  <input
                    value={timestampToDateResult}
                    readOnly
                    placeholder={
                      singleResultHintTarget === "timestamp-to-date" && singleResultHintKey
                        ? t(singleResultHintKey)
                        : t("timestamp.placeholders.result")
                    }
                    className="timestamp-input"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 self-center"
                    aria-label={t("timestamp.actions.copyResult")}
                    title={t("timestamp.actions.copyResult")}
                    onClick={() => {
                      setSingleResultHintTarget("timestamp-to-date")
                      copyText(
                        timestampToDateResult,
                        "timestamp.toast.copyResult",
                        setSingleErrorKey,
                        setSingleResultHintKey,
                      )
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <select
                    value={singleTimeZone}
                    onChange={(event) => setSingleTimeZone(event.target.value)}
                    className="timestamp-select"
                  >
                    {supportedTimeZones.map((timeZone) => (
                      <option key={timeZone} value={timeZone}>
                        {timeZone}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_12rem_auto_minmax(0,1.05fr)_auto_8rem]">
                  <input
                    value={dateTimeInput}
                    onChange={(event) => {
                      setDateTimeInput(event.target.value)
                      if (singleResultHintTarget === "date-to-timestamp") {
                        setSingleResultHintKey(null)
                      }
                    }}
                    placeholder={t("timestamp.placeholders.dateTime")}
                    className="timestamp-input"
                    spellCheck={false}
                  />
                  <select
                    value={singleTimeZone}
                    onChange={(event) => setSingleTimeZone(event.target.value)}
                    className="timestamp-select"
                  >
                    {supportedTimeZones.map((timeZone) => (
                      <option key={timeZone} value={timeZone}>
                        {timeZone}
                      </option>
                    ))}
                  </select>
                  <Button type="button" className="gap-2" onClick={handleDateToTimestamp}>
                    <WandSparkles className="size-4" />
                    {t("timestamp.actions.convert")}
                  </Button>
                  <input
                    value={dateToTimestampResult}
                    readOnly
                    placeholder={
                      singleResultHintTarget === "date-to-timestamp" && singleResultHintKey
                        ? t(singleResultHintKey)
                        : t("timestamp.placeholders.result")
                    }
                    className="timestamp-input"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 self-center"
                    aria-label={t("timestamp.actions.copyResult")}
                    title={t("timestamp.actions.copyResult")}
                    onClick={() => {
                      setSingleResultHintTarget("date-to-timestamp")
                      copyText(
                        dateToTimestampResult,
                        "timestamp.toast.copyResult",
                        setSingleErrorKey,
                        setSingleResultHintKey,
                      )
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <select
                    value={singleDateResultUnit}
                    onChange={(event) => setSingleDateResultUnit(event.target.value as TimestampUnit)}
                    className="timestamp-select"
                  >
                    <option value="seconds">{t("timestamp.unit.seconds")}</option>
                    <option value="milliseconds">{t("timestamp.unit.milliseconds")}</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              {batchAlert ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("alert.invalidInput")}</AlertTitle>
                  <AlertDescription>{batchAlert}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/35 p-3">
                <div data-slot="button-group" className="inline-flex rounded-xl border border-border/70 bg-background/75 p-1">
                  {([
                    ["timestamp-to-date", "timestamp.batch.timestampToDate"],
                    ["date-to-timestamp", "timestamp.batch.dateToTimestamp"],
                  ] as const).map(([value, labelKey]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={batchDirection === value ? "default" : "ghost"}
                      className="rounded-lg"
                      onClick={() => setBatchDirection(value)}
                    >
                      {t(labelKey)}
                    </Button>
                  ))}
                </div>

                <Separator orientation="vertical" className="hidden h-8 sm:block" />

                <select
                  value={batchUnit}
                  onChange={(event) => setBatchUnit(event.target.value as TimestampUnit)}
                  className="timestamp-select w-auto min-w-36"
                >
                  <option value="milliseconds">{t("timestamp.unit.milliseconds")}</option>
                  <option value="seconds">{t("timestamp.unit.seconds")}</option>
                </select>

                <select
                  value={batchTimeZone}
                  onChange={(event) => setBatchTimeZone(event.target.value)}
                  className="timestamp-select w-auto min-w-44"
                >
                  {supportedTimeZones.map((timeZone) => (
                    <option key={timeZone} value={timeZone}>
                      {timeZone}
                    </option>
                  ))}
                </select>

                <Button type="button" className="gap-2" onClick={handleConvertBatch}>
                  <WandSparkles className="size-4" />
                  {t("timestamp.actions.convertBatch")}
                </Button>
              </div>

              <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
                <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="timestamp-batch-input">{t("timestamp.batch.input")}</Label>
                    <span className="text-xs text-muted-foreground">{t("timestamp.batch.onePerLine")}</span>
                  </div>
                  <Textarea
                    id="timestamp-batch-input"
                    value={batchInput}
                    onChange={(event) => {
                      setBatchInput(event.target.value)
                      setBatchResultHintKey(null)
                    }}
                    placeholder={t(
                      batchDirection === "timestamp-to-date"
                        ? "timestamp.placeholders.batchTimestamp"
                        : "timestamp.placeholders.batchDateTime",
                    )}
                    className="min-h-[20rem] flex-1 resize-none overflow-auto border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0"
                    spellCheck={false}
                  />
                </section>

                <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="timestamp-batch-output">{t("timestamp.batch.output")}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label={t("timestamp.actions.copyBatch")}
                      title={t("timestamp.actions.copyBatch")}
                      onClick={() => copyText(batchResult, "timestamp.toast.copyBatch", setBatchErrorKey, setBatchResultHintKey)}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <Textarea
                    id="timestamp-batch-output"
                    value={batchResult}
                    readOnly
                    placeholder={batchResultHintKey ? t(batchResultHintKey) : t("timestamp.placeholders.result")}
                    className={cn(
                      "min-h-[20rem] flex-1 resize-none overflow-auto border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0",
                      batchResult && "text-foreground",
                    )}
                  />
                </section>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
