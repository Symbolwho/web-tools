import { ArrowLeftRight, Copy, Eraser, FileText } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { InlineFieldError } from "@/components/inline-field-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/lib/i18n"
import { decodeBase64, encodeBase64 } from "@/lib/base64-text-tools"

type Mode = "encode" | "decode"

const SOURCE_KEY = "web-tools:base64-text-source"
const MODE_KEY = "web-tools:base64-text-mode"
const URLSAFE_KEY = "web-tools:base64-text-urlsafe"

function getInitialMode(): Mode {
  if (typeof window === "undefined") return "encode"
  return window.localStorage.getItem(MODE_KEY) === "decode" ? "decode" : "encode"
}

function getInitialSource(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(SOURCE_KEY) ?? ""
}

function getInitialUrlSafe(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(URLSAFE_KEY) === "true"
}

export function Base64TextToolSurface() {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>(getInitialMode)
  const [source, setSource] = useState(getInitialSource)
  const [urlSafe, setUrlSafe] = useState(getInitialUrlSafe)

  function handleSourceChange(v: string) {
    setSource(v)
    if (v) window.localStorage.setItem(SOURCE_KEY, v)
    else window.localStorage.removeItem(SOURCE_KEY)
  }

  function handleModeChange(next: Mode) {
    setMode(next)
    window.localStorage.setItem(MODE_KEY, next)
  }

  function handleUrlSafeChange(next: boolean) {
    setUrlSafe(next)
    window.localStorage.setItem(URLSAFE_KEY, String(next))
  }

  const result = useMemo(() => {
    if (!source.trim()) return null
    return mode === "encode" ? encodeBase64(source, urlSafe) : decodeBase64(source)
  }, [source, mode, urlSafe])

  const output = result?.ok ? result.value : ""
  const errorMessage = result && !result.ok ? t(result.errorKey) : null

  function handleSwap() {
    if (!result?.ok) {
      toast.error(t("base64Text.errors.nothingToSwap"))
      return
    }
    handleModeChange(mode === "encode" ? "decode" : "encode")
    handleSourceChange(result.value)
  }

  function handleClear() {
    handleSourceChange("")
  }

  async function handleCopy() {
    if (!output) {
      toast.error(t("errors.nothingToCopy"))
      return
    }
    try {
      await navigator.clipboard.writeText(output)
      toast.success(t("base64Text.toast.copyOutput"))
    } catch {
      toast.error(t("errors.copyFailed"))
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="flex min-h-0 flex-1 flex-col border-border/70 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/35 p-3">
            <div data-slot="button-group" className="inline-flex rounded-lg border border-border/70 bg-muted/35 p-1">
              {(["encode", "decode"] as const).map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={mode === m ? "default" : "ghost"}
                  className="gap-1.5 rounded-md"
                  onClick={() => handleModeChange(m)}
                >
                  {t(`base64Text.mode.${m}`)}
                </Button>
              ))}
            </div>
            {mode === "encode" && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={urlSafe}
                  onChange={(e) => handleUrlSafeChange(e.target.checked)}
                  className="accent-primary"
                />
                {t("base64Text.labels.urlSafe")}
              </label>
            )}
            <Button type="button" variant="secondary" className="ml-auto gap-2" onClick={handleSwap}>
              <ArrowLeftRight className="size-4" />
              {t("base64Text.actions.swap")}
            </Button>
            <Button type="button" variant="secondary" className="gap-2" onClick={handleCopy} disabled={!output}>
              <Copy className="size-4" />
              {t("base64Text.actions.copyOutput")}
            </Button>
            <Button type="button" variant="ghost" className="gap-2" onClick={handleClear}>
              <Eraser className="size-4" />
              {t("actions.clear")}
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
            <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="base64-text-input">{t("base64Text.sections.input")}</Label>
                <span className="text-xs text-muted-foreground">{source.length} {t("labels.chars")}</span>
              </div>
              <Textarea
                id="base64-text-input"
                value={source}
                onChange={(e) => handleSourceChange(e.target.value)}
                placeholder={t(mode === "encode" ? "base64Text.placeholders.encodeInput" : "base64Text.placeholders.decodeInput")}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? "base64-text-input-error" : undefined}
                className="mt-3 min-h-[16rem] flex-1 resize-none overflow-auto rounded-none border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0"
                spellCheck={false}
              />
              {errorMessage ? <InlineFieldError id="base64-text-input-error" message={errorMessage} /> : null}
            </section>

            <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="base64-text-output">{t("base64Text.sections.output")}</Label>
                <span className="text-xs text-muted-foreground">{output.length} {t("labels.chars")}</span>
              </div>
              {output ? (
                <Textarea
                  id="base64-text-output"
                  value={output}
                  readOnly
                  className="mt-3 min-h-[16rem] flex-1 resize-none overflow-auto rounded-none border-0 bg-transparent px-0 py-0 font-mono text-sm text-foreground shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0"
                  spellCheck={false}
                />
              ) : (
                <div className="mt-3 flex min-h-[16rem] flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 text-center text-sm text-muted-foreground xl:min-h-0">
                  <FileText className="size-8" />
                  <p className="max-w-sm">{t("base64Text.placeholders.output")}</p>
                </div>
              )}
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
