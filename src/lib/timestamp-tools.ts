export type TimestampUnit = "seconds" | "milliseconds"
export type TimestampMode = "single" | "batch"
export type TimestampDirection = "timestamp-to-date" | "date-to-timestamp"

export type TimestampToolErrorKey =
  | "timestamp.errors.emptyTimestamp"
  | "timestamp.errors.invalidTimestamp"
  | "timestamp.errors.emptyDateTime"
  | "timestamp.errors.invalidDateTime"
  | "timestamp.errors.invalidTimezone"
  | "timestamp.errors.emptyBatch"

export type TimestampToolResult<T> = { ok: true; value: T } | { ok: false; errorKey: TimestampToolErrorKey }

export type BatchConversionRow =
  | { ok: true; value: string; input: string }
  | { ok: false; errorKey: TimestampToolErrorKey; input: string }

const DATE_TIME_INPUT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/

const timeZonePartsFormatterCache = new Map<string, Intl.DateTimeFormat>()

type DateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  millisecond: number
}

function ok<T>(value: T): TimestampToolResult<T> {
  return { ok: true, value }
}

function err<T>(errorKey: TimestampToolErrorKey): TimestampToolResult<T> {
  return { ok: false, errorKey }
}

function getUtcComparableValue(parts: DateTimeParts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  )
}

function padMilliseconds(value: string | undefined) {
  return value ? value.padEnd(3, "0").slice(0, 3) : "000"
}

function padNumber(value: number, length = 2) {
  return String(value).padStart(length, "0")
}

function formatDateTimeParts(parts: DateTimeParts) {
  const base = `${padNumber(parts.year, 4)}-${padNumber(parts.month)}-${padNumber(parts.day)} ${padNumber(parts.hour)}:${padNumber(parts.minute)}:${padNumber(parts.second)}`

  return parts.millisecond > 0 ? `${base}.${padNumber(parts.millisecond, 3)}` : base
}

function parseDateTimeParts(input: string): TimestampToolResult<DateTimeParts> {
  const trimmed = input.trim()

  if (!trimmed) {
    return err("timestamp.errors.emptyDateTime")
  }

  const match = DATE_TIME_INPUT_PATTERN.exec(trimmed)
  if (!match) {
    return err("timestamp.errors.invalidDateTime")
  }

  const [, year, month, day, hour, minute, second = "00", millisecond] = match
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(padMilliseconds(millisecond)),
  }

  const candidate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond),
  )

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== parts.year ||
    candidate.getUTCMonth() !== parts.month - 1 ||
    candidate.getUTCDate() !== parts.day ||
    candidate.getUTCHours() !== parts.hour ||
    candidate.getUTCMinutes() !== parts.minute ||
    candidate.getUTCSeconds() !== parts.second ||
    candidate.getUTCMilliseconds() !== parts.millisecond
  ) {
    return err("timestamp.errors.invalidDateTime")
  }

  return ok(parts)
}

function getTimeZonePartsFormatter(timeZone: string) {
  const cached = timeZonePartsFormatterCache.get(timeZone)
  if (cached) {
    return cached
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  })

  timeZonePartsFormatterCache.set(timeZone, formatter)
  return formatter
}

function isValidTimeZone(timeZone: string) {
  try {
    getTimeZonePartsFormatter(timeZone)
    return true
  } catch {
    return false
  }
}

function getTimeZoneDateTimeParts(epochMs: number, timeZone: string): DateTimeParts {
  const formatter = getTimeZonePartsFormatter(timeZone)
  const formattedParts = formatter.formatToParts(new Date(epochMs))

  const values = Object.fromEntries(
    formattedParts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    millisecond: Number(values.fractionalSecond ?? "0"),
  }
}

function sameDateTimeParts(left: DateTimeParts, right: DateTimeParts) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.second === right.second &&
    left.millisecond === right.millisecond
  )
}

function resolveEpochFromZonedDateTime(parts: DateTimeParts, timeZone: string): TimestampToolResult<number> {
  if (!isValidTimeZone(timeZone)) {
    return err("timestamp.errors.invalidTimezone")
  }

  let guess = getUtcComparableValue(parts)

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const actual = getTimeZoneDateTimeParts(guess, timeZone)
    const diff = getUtcComparableValue(parts) - getUtcComparableValue(actual)

    if (diff === 0) {
      return ok(guess)
    }

    guess += diff
  }

  const resolved = getTimeZoneDateTimeParts(guess, timeZone)
  return sameDateTimeParts(parts, resolved) ? ok(guess) : err("timestamp.errors.invalidDateTime")
}

function normalizeTimestamp(input: string, unit: TimestampUnit): TimestampToolResult<number> {
  const trimmed = input.trim()

  if (!trimmed) {
    return err("timestamp.errors.emptyTimestamp")
  }

  if (!/^[+-]?\d+(?:\.\d+)?$/u.test(trimmed)) {
    return err("timestamp.errors.invalidTimestamp")
  }

  const numericValue = Number(trimmed)
  if (!Number.isFinite(numericValue)) {
    return err("timestamp.errors.invalidTimestamp")
  }

  return ok(unit === "seconds" ? numericValue * 1000 : numericValue)
}

function formatEpochWithUnit(epochMs: number, unit: TimestampUnit) {
  if (unit === "milliseconds") {
    return String(Math.trunc(epochMs))
  }

  return String(Math.trunc(epochMs / 1000))
}

export function getDefaultTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}

export function getSupportedTimeZones() {
  const supportedValuesOf = (Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[]
  }).supportedValuesOf

  const defaultTimeZone = getDefaultTimeZone()
  const fallback = [defaultTimeZone, "UTC"]

  if (typeof supportedValuesOf !== "function") {
    return Array.from(new Set(fallback))
  }

  try {
    const values = supportedValuesOf("timeZone")
    return Array.from(new Set([defaultTimeZone, "UTC", ...values]))
  } catch {
    return Array.from(new Set(fallback))
  }
}

export function getCurrentTimestampValue(now: number, unit: TimestampUnit) {
  return unit === "milliseconds" ? String(now) : String(Math.trunc(now / 1000))
}

export function formatTimestampForDisplay(epochMs: number, timeZone: string) {
  return formatDateTimeParts(getTimeZoneDateTimeParts(epochMs, timeZone))
}

export function convertTimestampToDate(
  input: string,
  unit: TimestampUnit,
  _locale: string,
  timeZone: string,
): TimestampToolResult<string> {
  const normalized = normalizeTimestamp(input, unit)
  if (!normalized.ok) {
    return normalized
  }

  if (!isValidTimeZone(timeZone)) {
    return err("timestamp.errors.invalidTimezone")
  }

  return ok(formatTimestampForDisplay(normalized.value, timeZone))
}

export function convertDateToTimestamp(
  input: string,
  unit: TimestampUnit,
  timeZone: string,
): TimestampToolResult<string> {
  const parsed = parseDateTimeParts(input)
  if (!parsed.ok) {
    return parsed
  }

  const resolvedEpoch = resolveEpochFromZonedDateTime(parsed.value, timeZone)
  if (!resolvedEpoch.ok) {
    return resolvedEpoch
  }

  return ok(formatEpochWithUnit(resolvedEpoch.value, unit))
}

export function convertBatchValues(
  input: string,
  direction: TimestampDirection,
  unit: TimestampUnit,
  locale: string,
  timeZone: string,
): TimestampToolResult<BatchConversionRow[]> {
  const lines = input.split(/\r?\n/u)

  if (!lines.some((line) => line.trim())) {
    return err("timestamp.errors.emptyBatch")
  }

  return ok(
    lines.map((line) => {
      if (!line.trim()) {
        return { ok: true, value: "", input: line }
      }

      const result =
        direction === "timestamp-to-date"
          ? convertTimestampToDate(line, unit, locale, timeZone)
          : convertDateToTimestamp(line, unit, timeZone)

      return result.ok
        ? { ok: true, value: result.value, input: line }
        : { ok: false, errorKey: result.errorKey, input: line }
    }),
  )
}
