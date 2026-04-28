import { Copy, Download, Eraser, ImageUp, Upload } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { InlineFieldError } from "@/components/inline-field-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/lib/i18n"
import {
  fileToBase64,
  formatFileSize,
  parseBase64Input,
  type ImageMeta,
} from "@/lib/base64-image-tools"
import { cn } from "@/lib/utils"

type Mode = "imageToBase64" | "base64ToImage"

const BASE64_SOURCE_KEY = "web-tools:base64-image-source"
const BASE64_MODE_KEY = "web-tools:base64-image-mode"

function getInitialMode(): Mode {
  if (typeof window === "undefined") return "imageToBase64"
  const stored = window.localStorage.getItem(BASE64_MODE_KEY)
  return stored === "base64ToImage" ? "base64ToImage" : "imageToBase64"
}

function getInitialBase64Source(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(BASE64_SOURCE_KEY) ?? ""
}

export function Base64ImageToolSurface() {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>(getInitialMode)
  const [base64Source, setBase64Source] = useState(getInitialBase64Source)
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [includeDataUri, setIncludeDataUri] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.localStorage.setItem(BASE64_MODE_KEY, mode)
  }, [mode])

  useEffect(() => {
    if (mode === "base64ToImage") {
      if (base64Source) {
        window.localStorage.setItem(BASE64_SOURCE_KEY, base64Source)
      } else {
        window.localStorage.removeItem(BASE64_SOURCE_KEY)
      }
    }
  }, [base64Source, mode])

  const parsedBase64 = useMemo(() => {
    if (mode !== "base64ToImage" || !base64Source.trim()) return null
    return parseBase64Input(base64Source)
  }, [mode, base64Source])

  useEffect(() => {
    if (!parsedBase64 || !parsedBase64.ok) {
      setPreviewUrl(null)
      setPreviewError(parsedBase64 && !parsedBase64.ok ? t(parsedBase64.errorKey) : null)
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (!cancelled) {
        setPreviewUrl(parsedBase64.value)
        setPreviewError(null)
      }
    }
    img.onerror = () => {
      if (!cancelled) {
        setPreviewUrl(null)
        setPreviewError(t("base64Image.errors.invalidBase64"))
      }
    }
    img.src = parsedBase64.value
    return () => { cancelled = true }
  }, [parsedBase64, t])

  const handleFileSelect = useCallback(async (file: File) => {
    const result = await fileToBase64(file)
    if (result.ok && result.meta) {
      setImageMeta(result.meta)
      setPreviewUrl(result.meta.dataUri)
      setPreviewError(null)
    } else if (!result.ok) {
      toast.error(t(result.errorKey))
    }
  }, [t])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith("image/")) handleFileSelect(file)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ""
  }

  async function handleCopyBase64() {
    const content = imageMeta ? (includeDataUri ? imageMeta.dataUri : imageMeta.rawBase64) : null
    if (!content) { toast.error(t("errors.nothingToCopy")); return }
    try {
      await navigator.clipboard.writeText(content)
      toast.success(t("base64Image.toast.copyBase64"))
    } catch { toast.error(t("errors.copyFailed")) }
  }

  function handleDownloadImage() {
    if (!previewUrl || mode !== "base64ToImage") return
    const a = document.createElement("a")
    a.href = previewUrl
    a.download = "image"
    a.click()
    toast.success(t("base64Image.toast.downloadSuccess"))
  }

  function handleClear() {
    setBase64Source("")
    setImageMeta(null)
    setPreviewUrl(null)
    setPreviewError(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="flex min-h-0 flex-1 flex-col border-border/70 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/35 p-3">
            <div data-slot="button-group" className="inline-flex rounded-lg border border-border/70 bg-muted/35 p-1">
              {(["imageToBase64", "base64ToImage"] as const).map((m) => (
                <Button key={m} type="button" size="sm" variant={mode === m ? "default" : "ghost"} className="rounded-md" onClick={() => { setMode(m); handleClear() }}>
                  {t(`base64Image.mode.${m}`)}
                </Button>
              ))}
            </div>
            {mode === "imageToBase64" && imageMeta && (
              <>
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={includeDataUri} onChange={(e) => setIncludeDataUri(e.target.checked)} className="accent-primary" />
                  {t("base64Image.labels.includeDataUri")}
                </label>
                <Button type="button" variant="secondary" className="gap-2" onClick={handleCopyBase64}>
                  <Copy className="size-4" />{t("base64Image.actions.copyBase64")}
                </Button>
              </>
            )}
            {mode === "base64ToImage" && previewUrl && (
              <Button type="button" variant="secondary" className="ml-auto gap-2" onClick={handleDownloadImage}>
                <Download className="size-4" />{t("base64Image.actions.downloadImage")}
              </Button>
            )}
            <Button type="button" variant="ghost" className="gap-2" onClick={handleClear}>
              <Eraser className="size-4" />{t("actions.clear")}
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
            {mode === "imageToBase64" ? (
              <>
                <section
                  className={cn(
                    "flex min-h-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-background/65 p-6 shadow-sm transition-colors",
                    isDragging && "border-primary/60 bg-primary/5",
                  )}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click() }}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />
                  {previewUrl ? (
                    <img src={previewUrl} alt="preview" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Upload className="size-8" />
                      <p className="text-sm">{t("base64Image.actions.dropOrClick")}</p>
                    </div>
                  )}
                </section>
                <section className="flex min-h-0 flex-col gap-3 rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <Label>{t("base64Image.sections.output")}</Label>
                  {imageMeta ? (
                    <>
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2"><span className="text-xs text-muted-foreground">{t("base64Image.labels.fileName")}</span><p className="mt-1 truncate font-mono text-xs">{imageMeta.fileName}</p></div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2"><span className="text-xs text-muted-foreground">{t("base64Image.labels.fileSize")}</span><p className="mt-1 font-mono text-xs">{formatFileSize(imageMeta.fileSize)}</p></div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2"><span className="text-xs text-muted-foreground">{t("base64Image.labels.dimensions")}</span><p className="mt-1 font-mono text-xs">{imageMeta.width} x {imageMeta.height}</p></div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-2"><span className="text-xs text-muted-foreground">{t("base64Image.labels.mimeType")}</span><p className="mt-1 font-mono text-xs">{imageMeta.mimeType}</p></div>
                      </div>
                      <Textarea value={includeDataUri ? imageMeta.dataUri : imageMeta.rawBase64} readOnly className="min-h-[10rem] flex-1 resize-none font-mono text-xs" spellCheck={false} />
                    </>
                  ) : (
                    <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t("base64Image.placeholders.preview")}</p>
                  )}
                </section>
              </>
            ) : (
              <>
                <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <Label htmlFor="base64-input">{t("base64Image.sections.input")}</Label>
                  <Textarea
                    id="base64-input"
                    value={base64Source}
                    onChange={(e) => setBase64Source(e.target.value)}
                    placeholder={t("base64Image.placeholders.base64Input")}
                    className="mt-3 min-h-[20rem] flex-1 resize-none overflow-auto border-0 bg-transparent px-0 py-0 font-mono text-xs shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0"
                    spellCheck={false}
                  />
                  {previewError && <InlineFieldError id="base64-input-error" message={previewError} />}
                </section>
                <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <Label>{t("base64Image.sections.output")}</Label>
                  <div className="mt-3 flex min-h-[20rem] flex-1 items-center justify-center overflow-auto rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 xl:min-h-0">
                    {previewUrl ? (
                      <img src={previewUrl} alt="preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
                        <ImageUp className="size-8" />
                        <p className="max-w-sm text-sm">{t("base64Image.placeholders.preview")}</p>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
