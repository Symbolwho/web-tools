import { useEffect, useRef } from "react"
import { EditorState, StateEffect, StateField } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, lineNumbers, placeholder as cmPlaceholder, type ViewUpdate } from "@codemirror/view"
import { json } from "@codemirror/lang-json"
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"
import type { JsonErrorPosition } from "@/lib/json-error-position"
import { cn } from "@/lib/utils"

const setErrorEffect = StateEffect.define<JsonErrorPosition | null>()

const errorLineDecoration = Decoration.line({ class: "cm-error-line" })
const errorMarkDecoration = Decoration.mark({ class: "cm-error-mark" })

const errorField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setErrorEffect)) {
        if (!effect.value) return Decoration.none
        const doc = tr.state.doc
        const lineNum = Math.min(Math.max(effect.value.line, 1), doc.lines)
        const line = doc.line(lineNum)
        const ranges = [errorLineDecoration.range(line.from)]

        // Underline the offending character. When the error points past the end
        // of the line (e.g. unexpected end of input), underline the last one.
        const col = Math.max(effect.value.column, 1)
        let from = Math.min(line.from + col - 1, line.to)
        if (from >= line.to) from = Math.max(line.from, line.to - 1)
        if (from < line.to) {
          ranges.push(errorMarkDecoration.range(from, from + 1))
        }

        return Decoration.set(ranges, true)
      }
    }
    return deco.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f),
})

const editorTheme = EditorView.theme({
  "&": {
    fontSize: "0.875rem",
    backgroundColor: "transparent",
    height: "100%",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { overflow: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
  ".cm-content": { caretColor: "oklch(var(--foreground))", padding: "0" },
  ".cm-cursor": { borderLeftColor: "oklch(var(--foreground))" },
  ".cm-gutters": { backgroundColor: "transparent", color: "oklch(var(--muted-foreground))", border: "none", paddingRight: "8px" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "oklch(var(--foreground))" },
  ".cm-activeLine": { backgroundColor: "oklch(var(--accent) / 0.4)" },
  ".cm-selectionBackground": { backgroundColor: "oklch(var(--accent) / 0.6) !important" },
  ".cm-error-line": { backgroundColor: "oklch(var(--destructive) / 0.15)" },
  ".cm-error-mark": {
    textDecoration: "underline wavy oklch(var(--destructive))",
    textDecorationSkipInk: "none",
    textUnderlineOffset: "3px",
  },
  ".cm-placeholder": { color: "oklch(var(--muted-foreground))" },
})
interface JsonCodeEditorProps {
  value: string
  onChange: (value: string) => void
  errorPosition?: JsonErrorPosition | null
  placeholder?: string
  className?: string
}

export function JsonCodeEditor({ value, onChange, errorPosition, placeholder, className }: JsonCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        json(),
        lineNumbers(),
        EditorView.lineWrapping,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        editorTheme,
        errorField,
        cmPlaceholder(placeholder ?? ""),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === value) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    })
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: setErrorEffect.of(errorPosition ?? null),
    })
  }, [errorPosition])

  return <div ref={containerRef} className={cn("overflow-auto", className)} />
}
