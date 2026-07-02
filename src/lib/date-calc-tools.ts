export type DateCalcMode = "add" | "diff"

export interface DateCalcAddResult {
  ok: true
  date: string
  weekday: string
}

export interface DateCalcDiffResult {
  ok: true
  days: number
}

export interface DateCalcError {
  ok: false
  error: string
}

export type DateCalcResult = DateCalcAddResult | DateCalcDiffResult | DateCalcError

const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"]
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function getTodayString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function addDays(baseDate: string, days: number, locale: "zh-CN" | "en"): DateCalcResult {
  if (!baseDate) {
    return { ok: false, error: "emptyDate" }
  }

  const parsed = new Date(baseDate + "T00:00:00")
  if (isNaN(parsed.getTime())) {
    return { ok: false, error: "invalidDate" }
  }

  if (!Number.isFinite(days)) {
    return { ok: false, error: "invalidDays" }
  }

  const result = new Date(parsed)
  result.setDate(result.getDate() + days)

  const y = result.getFullYear()
  const m = String(result.getMonth() + 1).padStart(2, "0")
  const d = String(result.getDate()).padStart(2, "0")
  const weekdays = locale === "zh-CN" ? WEEKDAYS_ZH : WEEKDAYS_EN
  const weekday = weekdays[result.getDay()]

  return { ok: true, date: `${y}-${m}-${d}`, weekday }
}

export function diffDays(startDate: string, endDate: string): DateCalcResult {
  if (!startDate || !endDate) {
    return { ok: false, error: "emptyDate" }
  }

  const start = new Date(startDate + "T00:00:00")
  const end = new Date(endDate + "T00:00:00")

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { ok: false, error: "invalidDate" }
  }

  const diffMs = end.getTime() - start.getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))

  return { ok: true, days }
}
