import { Copy, Eraser, ImageUp, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { InlineFieldError } from "@/components/inline-field-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/lib/i18n"
import { parseSvgSource } from "@/lib/svg-tools"
import { cn } from "@/lib/utils"

const SVG_SOURCE_STORAGE_KEY = "web-tools:svg-source"

function getInitialSvgSource() {
  if (typeof window === "undefined") {
    return ""
  }

  return window.localStorage.getItem(SVG_SOURCE_STORAGE_KEY) ?? ""
}

function getMetadataValue(value: string | null, fallback: string) {
  return value?.trim() || fallback
}

export function SvgToolSurface() {
  const { t } = useI18n()
  const [source, setSource] = useState(getInitialSvgSource)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const parsedSource = useMemo(() => parseSvgSource(source), [source])
  const hasSource = Boolean(source.trim())
  const hasError = hasSource && !parsedSource.ok
  const errorMessage = hasError ? t(parsedSource.errorKey) : null
  const metadata = parsedSource.ok ? parsedSource.value.metadata : null

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (source) {
      window.localStorage.setItem(SVG_SOURCE_STORAGE_KEY, source)
    } else {
      window.localStorage.removeItem(SVG_SOURCE_STORAGE_KEY)
    }
  }, [source])

  useEffect(() => {
    if (!parsedSource.ok) {
      setPreviewUrl(null)
      return
    }

    const nextPreviewUrl = URL.createObjectURL(
      new Blob([parsedSource.value.markup], { type: "image/svg+xml;charset=utf-8" }),
    )

    setPreviewUrl(nextPreviewUrl)

    return () => {
      URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [parsedSource])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Prevent pinch-zoom gesture on Mac trackpad from zooming the browser
    const preventGesture = (e: Event) => {
      e.preventDefault()
    }

    container.addEventListener("gesturestart", preventGesture, { passive: false })
    container.addEventListener("gesturechange", preventGesture, { passive: false })
    container.addEventListener("gestureend", preventGesture, { passive: false })

    return () => {
      container.removeEventListener("gesturestart", preventGesture)
      container.removeEventListener("gesturechange", preventGesture)
      container.removeEventListener("gestureend", preventGesture)
    }
  }, [])

  async function handleCopySource() {
    if (!source.trim()) {
      toast.error(t("errors.nothingToCopy"))
      return
    }

    try {
      await navigator.clipboard.writeText(source)
      toast.success(t("svg.toast.copySource"))
    } catch {
      toast.error(t("errors.copyFailed"))
    }
  }

  function handleClear() {
    setSource("")
  }

  function handleZoomIn() {
    setScale((prev) => Math.min(prev * 1.2, 5))
  }

  function handleZoomOut() {
    setScale((prev) => Math.max(prev / 1.2, 0.1))
  }

  function handleResetView() {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    // Only zoom when Ctrl/Cmd is pressed, otherwise allow normal page scrolling
    if (!event.ctrlKey && !event.metaKey) return

    event.preventDefault()
    event.stopPropagation()
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    setScale((prev) => Math.max(0.1, Math.min(5, prev * delta)))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    setIsDragging(true)
    dragStartRef.current = { x: event.clientX - position.x, y: event.clientY - position.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return
    setPosition({
      x: event.clientX - dragStartRef.current.x,
      y: event.clientY - dragStartRef.current.y,
    })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="flex min-h-0 flex-1 flex-col border-border/70 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
          <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/35 p-3">
            <Button type="button" variant="secondary" className="gap-2" onClick={handleCopySource}>
              <Copy className="size-4" />
              {t("actions.copy")}
            </Button>
            <Button type="button" variant="ghost" className="gap-2" onClick={handleClear}>
              <Eraser className="size-4" />
              {t("actions.clear")}
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-4">
            <section
              className={cn(
                "flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm",
                hasError && "border-destructive/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="svg-source">{t("svg.sections.source")}</Label>
                <span className="text-xs text-muted-foreground">
                  {source.length} {t("labels.chars")}
                </span>
              </div>
              <Textarea
                id="svg-source"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder={t("svg.placeholders.source")}
                aria-invalid={hasError}
                aria-describedby={errorMessage ? "svg-source-error" : undefined}
                className="mt-3 min-h-[20rem] flex-1 resize-none overflow-auto rounded-none border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0"
                spellCheck={false}
              />
              {errorMessage ? <InlineFieldError id="svg-source-error" message={errorMessage} /> : null}
            </section>

            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">{t("svg.labels.viewBox")}</p>
                  <p className="mt-2 font-mono text-sm">{getMetadataValue(metadata?.viewBox ?? null, t("svg.labels.notSet"))}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">{t("svg.labels.width")}</p>
                  <p className="mt-2 font-mono text-sm">{getMetadataValue(metadata?.width ?? null, t("svg.labels.notSet"))}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">{t("svg.labels.height")}</p>
                  <p className="mt-2 font-mono text-sm">{getMetadataValue(metadata?.height ?? null, t("svg.labels.notSet"))}</p>
                </div>
              </div>

              <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="svg-preview">{t("svg.sections.preview")}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleZoomOut}
                        disabled={!previewUrl}
                        title={t("svg.actions.zoomOut")}
                      >
                        <ZoomOut className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleZoomIn}
                        disabled={!previewUrl}
                        title={t("svg.actions.zoomIn")}
                      >
                        <ZoomIn className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleResetView}
                        disabled={!previewUrl}
                        title={t("svg.actions.resetView")}
                      >
                        <Maximize2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div
                  ref={containerRef}
                  id="svg-preview"
                  className="mt-3 flex min-h-[20rem] flex-1 select-none items-center justify-center overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 xl:min-h-0"
                  onWheel={previewUrl ? handleWheel : undefined}
                  onPointerDown={previewUrl ? handlePointerDown : undefined}
                  onPointerMove={previewUrl ? handlePointerMove : undefined}
                  onPointerUp={previewUrl ? handlePointerUp : undefined}
                  style={{
                    cursor: isDragging ? "grabbing" : previewUrl ? "grab" : "default",
                    touchAction: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                  }}
                >
                  {!hasSource ? (
                    <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
                      <ImageUp className="size-8" />
                      <p className="max-w-sm text-sm">{t("svg.placeholders.preview")}</p>
                    </div>
                  ) : hasError || !previewUrl ? (
                    <p className="max-w-sm text-center text-sm text-destructive">{errorMessage}</p>
                  ) : (
                    <img
                      src={previewUrl}
                      alt={t("svg.preview.alt")}
                      className="pointer-events-none max-h-full max-w-full object-contain"
                      style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? "none" : "transform 0.1s ease-out",
                      }}
                    />
                  )}
                </div>
              </section>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
