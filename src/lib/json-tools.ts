export type JsonToolErrorKey =
  | "errors.inputEmpty"
  | "errors.expectedJsonStringLiteral"

export type JsonToolResult =
  | { ok: true; value: string }
  | { ok: false; error: string }
  | { ok: false; errorKey: JsonToolErrorKey }

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type ParsedJsonResult = { ok: true; value: JsonValue } | { ok: false; error?: string }

function ok(value: string): JsonToolResult {
  return { ok: true, value }
}

function err(error: string): JsonToolResult {
  return { ok: false, error }
}

function errKey(errorKey: JsonToolErrorKey): JsonToolResult {
  return { ok: false, errorKey }
}

function formatPrimitive(value: JsonPrimitive) {
  return value === null ? "null" : typeof value === "string" ? JSON.stringify(value) : String(value)
}

function isJsonObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return value !== null && !Array.isArray(value) && typeof value === "object"
}

function appendTrailingComma(lines: string[]) {
  return lines.map((line, index) => (index === lines.length - 1 ? `${line},` : line))
}

function formatJsonLines(value: JsonValue, indent: number, level = 0): string[] {
  const currentIndent = " ".repeat(level * indent)
  const childIndent = " ".repeat((level + 1) * indent)

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${currentIndent}[`, `${currentIndent}]`]
    }

    return [
      `${currentIndent}[`,
      ...value.flatMap((item, index) => {
        const itemLines =
          Array.isArray(item) || isJsonObject(item)
            ? formatJsonLines(item, indent, level + 1)
            : [`${childIndent}${formatPrimitive(item)}`]

        return index < value.length - 1 ? appendTrailingComma(itemLines) : itemLines
      }),
      `${currentIndent}]`,
    ]
  }

  if (isJsonObject(value)) {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      return [`${currentIndent}{`, `${currentIndent}}`]
    }

    return [
      `${currentIndent}{`,
      ...entries.flatMap(([key, entryValue], index) => {
        const entryLines =
          Array.isArray(entryValue) || isJsonObject(entryValue)
            ? [`${childIndent}${JSON.stringify(key)}:`, ...formatJsonLines(entryValue, indent, level + 1)]
            : [`${childIndent}${JSON.stringify(key)}: ${formatPrimitive(entryValue)}`]

        return index < entries.length - 1 ? appendTrailingComma(entryLines) : entryLines
      }),
      `${currentIndent}}`,
    ]
  }

  return [`${currentIndent}${formatPrimitive(value)}`]
}

function formatJsonValue(value: JsonValue, indent = 2) {
  return `${formatJsonLines(value, indent).join("\n")}\n`
}

export function parseJsonValue(input: string): ParsedJsonResult {
  if (!input.trim()) {
    return { ok: false }
  }

  try {
    return { ok: true, value: JSON.parse(input) as JsonValue }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : undefined }
  }
}

export function formatJson(input: string, indent = 2): JsonToolResult {
  if (!input.trim()) return errKey("errors.inputEmpty")

  try {
    const value = JSON.parse(input) as JsonValue
    return ok(formatJsonValue(value, indent))
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
}

export function minifyJson(input: string): JsonToolResult {
  if (!input.trim()) return errKey("errors.inputEmpty")

  try {
    const value = JSON.parse(input)
    return ok(JSON.stringify(value))
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
}

export function unescapeJsonString(input: string): JsonToolResult {
  if (!input.trim()) return errKey("errors.inputEmpty")

  try {
    const decoded = JSON.parse(input)
    if (typeof decoded !== "string") {
      return errKey("errors.expectedJsonStringLiteral")
    }

    return ok(decoded)
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
}

export function escapeJsonString(input: string): JsonToolResult {
  if (!input.trim()) return errKey("errors.inputEmpty")

  return ok(JSON.stringify(input))
}

export { formatJsonValue }
