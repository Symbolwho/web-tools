import * as React from "react"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const WEEKDAY_LABELS_ZH = ["一", "二", "三", "四", "五", "六", "日"]
const WEEKDAY_LABELS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

const MONTH_LABELS_ZH = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
]
const MONTH_LABELS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function parseDate(value: string) {
  const parts = value.split("-")
  if (parts.length !== 3) return null
  const y = Number(parts[0])
  const m = Number(parts[1]) - 1
  const d = Number(parts[2])
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return { year: y, month: m, day: d }
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  locale?: "zh-CN" | "en"
  className?: string
}

export function DatePicker({ value, onChange, locale = "zh-CN", className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const parsed = parseDate(value)
  const now = new Date()

  const [viewYear, setViewYear] = React.useState(parsed?.year ?? now.getFullYear())
  const [viewMonth, setViewMonth] = React.useState(parsed?.month ?? now.getMonth())

  React.useEffect(() => {
    if (open && parsed) {
      setViewYear(parsed.year)
      setViewMonth(parsed.month)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const weekdayLabels = locale === "zh-CN" ? WEEKDAY_LABELS_ZH : WEEKDAY_LABELS_EN
  const monthLabels = locale === "zh-CN" ? MONTH_LABELS_ZH : MONTH_LABELS_EN

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  function selectDay(day: number) {
    onChange(formatDate(viewYear, viewMonth, day))
    setOpen(false)
  }

  const todayStr = formatDate(now.getFullYear(), now.getMonth(), now.getDate())

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-start gap-2 px-3 font-mono text-sm font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {value || (locale === "zh-CN" ? "选择日期" : "Pick a date")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="icon-sm" onClick={prevMonth} aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium">
              {locale === "zh-CN"
                ? `${viewYear}年 ${monthLabels[viewMonth]}`
                : `${monthLabels[viewMonth]} ${viewYear}`}
            </span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={nextMonth} aria-label="Next month">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-1 text-xs font-medium text-muted-foreground">
                {label}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="size-8" />
              }

              const dateStr = formatDate(viewYear, viewMonth, day)
              const isSelected = dateStr === value
              const isToday = dateStr === todayStr

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-md text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !isSelected && isToday && "border border-primary/50 font-semibold text-primary",
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
