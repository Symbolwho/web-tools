import { ArrowLeftRight, Copy, Eraser } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/lib/i18n"
import { computeDiff, getDiffStats } from "@/lib/diff-tools"
import { cn } from "@/lib/utils"

const LEFT_KEY = "web-tools:diff-left"
const RIGHT_KEY = "web-tools:diff-right"

function loadStored(key: string) {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(key) ?? ""
}

export function DiffToolSurface() {
  const { t } = useI18n()
  const [left, setLeft] = useState(() => loadStored(LEFT_KEY))
  const [right, setRight] = useState(() => loadStored(RIGHT_KEY))

  function handleLeftChange(v: string) {
    setLeft(v)
    window.localStorage.setItem(LEFT_KEY, v)
  }

  function handleRightChange(v: string) {
    setRight(v)
    window.localStorage.setItem(RIGHT_KEY, v)
  }

  function handleSwap() {
    handleLeftChange(right)
    handleRightChange(left)
  }

  function handleClear() {
    handleLeftChange("")
    handleRightChange("")
  }
  const diffLines = useMemo(() => {
    if (!left && !right) return null
    return computeDiff(left, right)
  }, [left, right])

  const stats = useMemo(() => (diffLines ? getDiffStats(diffLines) : null), [diffLines])

  async function handleCopyDiff() {
    if (!diffLines) {
      toast.error(t("errors.nothingToCopy"))
      return
    }
    const text = diffLines
      .map((l) => {
        const prefix = l.type === "added" ? "+ " : l.type === "removed" ? "- " : "  "
        return prefix + l.text
      })
      .join("\n")
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t("diff.toast.copyDiff"))
    } catch {
      toast.error(t("errors.copyFailed"))
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="flex min-h-0 flex-1 flex-col border-border/70 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/35 p-3">
            <Button type="button" variant="secondary" className="gap-2" onClick={handleSwap}>
              <ArrowLeftRight className="size-4" />
              {t("diff.actions.swap")}
            </Button>
            <Button type="button" variant="secondary" className="gap-2" onClick={handleCopyDiff} disabled={!diffLines}>
              <Copy className="size-4" />
              {t("diff.actions.copyDiff")}
            </Button>
            <Button type="button" variant="ghost" className="gap-2" onClick={handleClear}>
              <Eraser className="size-4" />
              {t("actions.clear")}
            </Button>
            {stats && (
              <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                <span className="text-green-600 dark:text-green-400">+{stats.added}</span>
                <span className="text-red-500 dark:text-red-400">-{stats.removed}</span>
                <span>{stats.equal} {t("diff.stats.unchanged")}</span>
              </div>
            )}
          </div>

          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
            <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="diff-left">{t("diff.sections.left")}</Label>
                <span className="text-xs text-muted-foreground">{left.length} {t("labels.chars")}</span>
              </div>
              <Textarea
                id="diff-left"
                value={left}
                onChange={(e) => handleLeftChange(e.target.value)}
                placeholder={t("diff.placeholders.left")}
                className="mt-3 min-h-[10rem] flex-1 resize-none overflow-auto border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0"
                spellCheck={false}
              />
            </section>

            <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="diff-right">{t("diff.sections.right")}</Label>
                <span className="text-xs text-muted-foreground">{right.length} {t("labels.chars")}</span>
              </div>
              <Textarea
                id="diff-right"
                value={right}
                onChange={(e) => handleRightChange(e.target.value)}
                placeholder={t("diff.placeholders.right")}
                className="mt-3 min-h-[10rem] flex-1 resize-none overflow-auto border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0"
                spellCheck={false}
              />
            </section>
          </div>

          {diffLines ? (
            <div className="min-h-0 overflow-auto rounded-xl border border-border/60 bg-background/65 shadow-sm">
              {diffLines.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">{t("diff.output.identical")}</p>
              ) : (
                <table className="w-full border-collapse font-mono text-sm">
                  <tbody>
                    {diffLines.map((line, i) => (
                      <tr
                        key={i}
                        className={cn(
                          "group",
                          line.type === "added" && "bg-green-500/10",
                          line.type === "removed" && "bg-red-500/10",
                        )}
                      >
                        <td className="w-10 select-none border-r border-border/40 px-2 py-0.5 text-right text-xs text-muted-foreground/60">
                          {line.leftLineNo ?? ""}
                        </td>
                        <td className="w-10 select-none border-r border-border/40 px-2 py-0.5 text-right text-xs text-muted-foreground/60">
                          {line.rightLineNo ?? ""}
                        </td>
                        <td
                          className={cn(
                            "w-5 select-none px-1 py-0.5 text-center text-xs font-bold",
                            line.type === "added" && "text-green-600 dark:text-green-400",
                            line.type === "removed" && "text-red-500 dark:text-red-400",
                            line.type === "equal" && "text-transparent",
                          )}
                        >
                          {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                        </td>
                        <td className="whitespace-pre px-2 py-0.5">{line.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-background/65 text-sm text-muted-foreground shadow-sm">
              {t("diff.placeholders.output")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
