import { useState } from "react"
import { CalendarPlus, CalendarMinus, Calculator } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n"
import {
  addDays,
  diffDays,
  getTodayString,
  type DateCalcMode,
} from "@/lib/date-calc-tools"
import { cn } from "@/lib/utils"

export function DateCalcToolSurface() {
  const { locale, t } = useI18n()
  const [mode, setMode] = useState<DateCalcMode>("add")
  const [baseDate, setBaseDate] = useState(getTodayString)
  const [days, setDays] = useState("0")
  const [startDate, setStartDate] = useState(getTodayString)
  const [endDate, setEndDate] = useState(getTodayString)
  const [addResult, setAddResult] = useState<{ date: string; weekday: string } | null>(null)
  const [diffResult, setDiffResult] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  function handleCalculateAdd() {
    setErrorMessage("")
    setAddResult(null)
    const numDays = Number(days)
    const result = addDays(baseDate, numDays, locale)
    if (!result.ok) {
      setErrorMessage(t(`dateCalc.errors.${result.error}` as "dateCalc.errors.emptyDate" | "dateCalc.errors.invalidDate" | "dateCalc.errors.invalidDays"))
      return
    }
    if ("date" in result) {
      setAddResult({ date: result.date, weekday: result.weekday })
    }
  }

  function handleCalculateDiff() {
    setErrorMessage("")
    setDiffResult(null)
    const result = diffDays(startDate, endDate)
    if (!result.ok) {
      setErrorMessage(t(`dateCalc.errors.${result.error}` as "dateCalc.errors.emptyDate" | "dateCalc.errors.invalidDate"))
      return
    }
    if ("days" in result) {
      setDiffResult(result.days)
    }
  }

  function handleModeSwitch(newMode: DateCalcMode) {
    setMode(newMode)
    setErrorMessage("")
    setAddResult(null)
    setDiffResult(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <Card className="border-border/60 bg-card/85 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex items-center gap-2">
            {(
              [
                ["add", "dateCalc.mode.add", CalendarPlus],
                ["diff", "dateCalc.mode.diff", CalendarMinus],
              ] as const
            ).map(([value, labelKey, Icon]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={mode === value ? "default" : "outline"}
                className="gap-1.5 rounded-lg"
                onClick={() => handleModeSwitch(value)}
              >
                <Icon className="size-3.5" />
                {t(labelKey)}
              </Button>
            ))}
          </div>

          {mode === "add" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("dateCalc.labels.baseDate")}</Label>
                <DatePicker value={baseDate} onChange={setBaseDate} locale={locale} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="date-calc-days">{t("dateCalc.labels.days")}</Label>
                <input
                  id="date-calc-days"
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  placeholder="0"
                  className="h-9 rounded-md border border-border bg-background px-3 py-1 font-mono text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-input dark:bg-input/30"
                />
                <p className="text-xs text-muted-foreground">{t("dateCalc.labels.daysHint")}</p>
              </div>
              <Button type="button" onClick={handleCalculateAdd} className="gap-1.5 self-start">
                <Calculator className="size-3.5" />
                {t("dateCalc.actions.calculate")}
              </Button>

              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}

              {addResult && (
                <div className="rounded-lg border border-border/60 bg-background/65 p-4 shadow-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t("dateCalc.result.add")}:</span>
                      <span className="font-mono text-base font-medium">{addResult.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t("dateCalc.result.weekday")}:</span>
                      <span className="text-base font-medium">
                        {locale === "zh-CN" ? `星期${addResult.weekday}` : addResult.weekday}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("dateCalc.labels.startDate")}</Label>
                <DatePicker value={startDate} onChange={setStartDate} locale={locale} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("dateCalc.labels.endDate")}</Label>
                <DatePicker value={endDate} onChange={setEndDate} locale={locale} />
              </div>
              <Button type="button" onClick={handleCalculateDiff} className="gap-1.5 self-start">
                <Calculator className="size-3.5" />
                {t("dateCalc.actions.calculate")}
              </Button>

              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}

              {diffResult !== null && (
                <div className="rounded-lg border border-border/60 bg-background/65 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t("dateCalc.result.diff")}:</span>
                    <span className={cn("font-mono text-base font-medium", diffResult < 0 && "text-destructive")}>
                      {diffResult} {locale === "zh-CN" ? "天" : "days"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
