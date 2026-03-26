export type SvgToolErrorKey = "svg.errors.emptySource" | "svg.errors.invalidXml" | "svg.errors.invalidRoot"

export type SvgToolResult<T> = { ok: true; value: T } | { ok: false; errorKey: SvgToolErrorKey }

export type SvgMetadata = {
  viewBox: string | null
  width: string | null
  height: string | null
}

export type ParsedSvgValue = {
  markup: string
  metadata: SvgMetadata
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg"

function ok<T>(value: T): SvgToolResult<T> {
  return { ok: true, value }
}

function err<T>(errorKey: SvgToolErrorKey): SvgToolResult<T> {
  return { ok: false, errorKey }
}

function hasParserError(document: XMLDocument) {
  return document.documentElement.localName === "parsererror" || document.getElementsByTagName("parsererror").length > 0
}

export function parseSvgSource(input: string): SvgToolResult<ParsedSvgValue> {
  const trimmed = input.trim()

  if (!trimmed) {
    return err("svg.errors.emptySource")
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(trimmed, "image/svg+xml")

  if (hasParserError(document)) {
    return err("svg.errors.invalidXml")
  }

  const root = document.documentElement
  if (root.localName !== "svg") {
    return err("svg.errors.invalidRoot")
  }

  if (!root.getAttribute("xmlns")) {
    root.setAttribute("xmlns", SVG_NAMESPACE)
  }

  return ok({
    markup: new XMLSerializer().serializeToString(root),
    metadata: {
      viewBox: root.getAttribute("viewBox"),
      width: root.getAttribute("width"),
      height: root.getAttribute("height"),
    },
  })
}
