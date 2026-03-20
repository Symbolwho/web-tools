import { ChevronDown, ChevronRight } from "lucide-react"
import { Fragment, useMemo, useState, type CSSProperties, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { parseJsonValue } from "@/lib/json-tools"
import { cn } from "@/lib/utils"

const BRACKET_DEPTH_CLASSES = [
  "json-bracket-depth-0",
  "json-bracket-depth-1",
  "json-bracket-depth-2",
  "json-bracket-depth-3",
  "json-bracket-depth-4",
] as const

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

type JsonOutputProps = {
  value: string
  placeholder?: string
  id?: string
  "aria-labelledby"?: string
  className?: string
}

function getBracketClass(depth: number) {
  return BRACKET_DEPTH_CLASSES[depth % BRACKET_DEPTH_CLASSES.length]
}

function isJsonObject(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && !Array.isArray(value) && typeof value === "object"
}

function formatPrimitive(value: JsonPrimitive) {
  if (typeof value === "string") {
    return JSON.stringify(value)
  }

  if (value === null) {
    return "null"
  }

  return String(value)
}

function appendObjectPath(basePath: string, key: string) {
  return /^[A-Za-z_$][\w$]*$/u.test(key) ? `${basePath}.${key}` : `${basePath}[${JSON.stringify(key)}]`
}

function getDepthStyle(depth: number) {
  return { "--json-tree-depth": depth } as CSSProperties
}

export function JsonOutput({ value, placeholder, id, className, ...props }: JsonOutputProps) {
  const { locale, t } = useI18n()
  const [collapsedPaths, setCollapsedPaths] = useState<Record<string, boolean>>({})
  const parsedJson = useMemo(() => parseJsonValue(value), [value])

  const formatCollectionSummary = (kind: "object" | "array", count: number) => {
    const unit = t(kind === "object" ? "jsonOutput.objectKeys" : "jsonOutput.arrayItems")
    return locale === "zh-CN" ? `… ${count}${unit}` : `… ${count} ${unit}`
  }

  const togglePath = (path: string) => {
    setCollapsedPaths((current) => ({
      ...current,
      [path]: !current[path],
    }))
  }

  const renderPropertyPrefix = (label?: string) => {
    if (label === undefined) {
      return null
    }

    return <span className="json-tree-property">{JSON.stringify(label)}: </span>
  }

  const renderNode = (
    node: JsonValue,
    depth: number,
    path: string,
    trailingComma = false,
    label?: string,
  ): ReactNode => {
    if (Array.isArray(node)) {
      const entries = node.map((item, index) => [index, item] as const)
      const bracketClassName = getBracketClass(depth)

      if (entries.length === 0) {
        return (
          <div key={path} className="json-tree-line" style={getDepthStyle(depth)}>
            {renderPropertyPrefix(label)}
            <span className={bracketClassName}>[</span>
            <span className={bracketClassName}>]</span>
            {trailingComma ? "," : null}
          </div>
        )
      }

      const isCollapsed = collapsedPaths[path] === true
      const buttonLabel = t(isCollapsed ? "jsonOutput.expandNode" : "jsonOutput.collapseNode")

      if (isCollapsed) {
        return (
          <div key={path} className="json-tree-line" style={getDepthStyle(depth)}>
            {renderPropertyPrefix(label)}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="json-tree-toggle"
              aria-label={buttonLabel}
              aria-expanded={false}
              title={buttonLabel}
              data-state="collapsed"
              onClick={() => togglePath(path)}
            >
              <ChevronRight className="size-3" />
            </Button>
            <span className={bracketClassName}>[</span>{" "}
            <span className="json-tree-summary">{formatCollectionSummary("array", entries.length)}</span>{" "}
            <span className={bracketClassName}>]</span>
            {trailingComma ? "," : null}
          </div>
        )
      }

      return (
        <Fragment key={path}>
          <div className="json-tree-line" style={getDepthStyle(depth)}>
            {renderPropertyPrefix(label)}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="json-tree-toggle"
              aria-label={buttonLabel}
              aria-expanded={true}
              title={buttonLabel}
              data-state="expanded"
              onClick={() => togglePath(path)}
            >
              <ChevronDown className="size-3" />
            </Button>
            <span className={bracketClassName}>[</span>
          </div>
          {entries.map(([entryKey, child], index) =>
            renderNode(child, depth + 1, `${path}[${entryKey}]`, index < entries.length - 1),
          )}
          <div className="json-tree-line" style={getDepthStyle(depth)}>
            <span className={bracketClassName}>]</span>
            {trailingComma ? "," : null}
          </div>
        </Fragment>
      )
    }

    if (isJsonObject(node)) {
      const entries = Object.entries(node)
      const bracketClassName = getBracketClass(depth)

      if (entries.length === 0) {
        return (
          <div key={path} className="json-tree-line" style={getDepthStyle(depth)}>
            {renderPropertyPrefix(label)}
            <span className={bracketClassName}>{"{"}</span>
            <span className={bracketClassName}>{"}"}</span>
            {trailingComma ? "," : null}
          </div>
        )
      }

      const isCollapsed = collapsedPaths[path] === true
      const buttonLabel = t(isCollapsed ? "jsonOutput.expandNode" : "jsonOutput.collapseNode")

      if (isCollapsed) {
        return (
          <div key={path} className="json-tree-line" style={getDepthStyle(depth)}>
            {renderPropertyPrefix(label)}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="json-tree-toggle"
              aria-label={buttonLabel}
              aria-expanded={false}
              title={buttonLabel}
              data-state="collapsed"
              onClick={() => togglePath(path)}
            >
              <ChevronRight className="size-3" />
            </Button>
            <span className={bracketClassName}>{"{"}</span>{" "}
            <span className="json-tree-summary">{formatCollectionSummary("object", entries.length)}</span>{" "}
            <span className={bracketClassName}>{"}"}</span>
            {trailingComma ? "," : null}
          </div>
        )
      }

      return (
        <Fragment key={path}>
          <div className="json-tree-line" style={getDepthStyle(depth)}>
            {renderPropertyPrefix(label)}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="json-tree-toggle"
              aria-label={buttonLabel}
              aria-expanded={true}
              title={buttonLabel}
              data-state="expanded"
              onClick={() => togglePath(path)}
            >
              <ChevronDown className="size-3" />
            </Button>
            <span className={bracketClassName}>{"{"}</span>
          </div>
          {entries.map(([entryKey, child], index) =>
            renderNode(
              child,
              depth + 1,
              appendObjectPath(path, entryKey),
              index < entries.length - 1,
              entryKey,
            ),
          )}
          <div className="json-tree-line" style={getDepthStyle(depth)}>
            <span className={bracketClassName}>{"}"}</span>
            {trailingComma ? "," : null}
          </div>
        </Fragment>
      )
    }

    return (
      <div key={path} className="json-tree-line" style={getDepthStyle(depth)}>
        {renderPropertyPrefix(label)}
        <span className="json-tree-value">{formatPrimitive(node)}</span>
        {trailingComma ? "," : null}
      </div>
    )
  }

  return (
    <div
      id={id}
      tabIndex={0}
      className={cn(
        "json-output flex min-h-[16rem] w-full flex-1 overflow-auto rounded-lg bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:outline-none focus-visible:ring-0",
        className,
      )}
      {...props}
    >
      {parsedJson.ok ? (
        <div className="json-output-tree w-full text-foreground">{renderNode(parsedJson.value as JsonValue, 0, "root")}</div>
      ) : (
        <pre className="json-output-content json-output-placeholder m-0 w-full">{placeholder}</pre>
      )}
    </div>
  )
}
