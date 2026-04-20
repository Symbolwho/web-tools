import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n"
import { computeDiff, getDiffStats } from "@/lib/diff-tools"
import { Button } from "@/components/ui/button"
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
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6 lg:p-8">
      {/* Input row */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{t("diff.sections.left")}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => handleLeftChange("")}
            >
              {t("actions.clear")}
            </Button>
          </div>
          <textarea
            className="min-h-[180px] flex-1 resize-none rounded-xl border border-border/70 bg-muted/30 p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            placeholder={t("diff.placeholders.left")}
            value={left}
            onChange={(e) => handleLeftChange(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{t("diff.sections.right")}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => handleRightChange("")}
            >
              {t("actions.clear")}
            </Button>
          </div>
          <textarea
            className="min-h-[180px] flex-1 resize-none rounded-xl border border-border/70 bg-muted/30 p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            placeholder={t("diff.placeholders.right")}
            value={right}
            onChange={(e) => handleRightChange(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={handleSwap}>
          {t("diff.actions.swap")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleCopyDiff} disabled={!diffLines}>
          {t("diff.actions.copyDiff")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
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

      {/* Diff output */}
      {diffLines && (
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/70 bg-muted/20">
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
      )}

      {!diffLines && (
        <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-xl border border-dashed border-border/50 text-sm text-muted-foreground">
          {t("diff.placeholders.output")}
        </div>
      )}
    </div>
  )
}
