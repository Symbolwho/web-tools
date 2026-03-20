import { Monitor, MoonStar, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useI18n, type Locale, type MessageKey } from "@/lib/i18n"
import { COLOR_THEMES, useThemeColor, type ColorTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

const LOCALES = ["zh-CN", "en"] as const satisfies readonly Locale[]
const MODE_OPTIONS = [
  { value: "light", icon: Sun, labelKey: "theme.light" },
  { value: "dark", icon: MoonStar, labelKey: "theme.dark" },
  { value: "system", icon: Monitor, labelKey: "theme.system" },
] as const satisfies readonly {
  value: "light" | "dark" | "system"
  icon: typeof Sun
  labelKey: MessageKey
}[]

const COLOR_THEME_LABELS: Record<ColorTheme, MessageKey> = {
  blue: "theme.blue",
  zinc: "theme.zinc",
  green: "theme.green",
  rose: "theme.rose",
}

const COLOR_SWATCH_CLASSNAMES: Record<ColorTheme, string> = {
  blue: "bg-blue-500 dark:bg-blue-400",
  zinc: "bg-zinc-500 dark:bg-zinc-300",
  green: "bg-emerald-500 dark:bg-emerald-400",
  rose: "bg-rose-500 dark:bg-rose-400",
}

export function SettingsSurface() {
  const { locale, setLocale, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useThemeColor()

  const selectedMode =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system"

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{t("settings.title")}</h2>
        <p className="text-xs leading-5 text-muted-foreground">{t("settings.description")}</p>
      </div>

      <Separator />

      <section className="space-y-2.5">
        <Label className="text-xs text-muted-foreground">{t("settings.language")}</Label>
        <div
          data-slot="button-group"
          className="inline-flex w-full rounded-xl border border-border/70 bg-muted/35 p-1"
        >
          {LOCALES.map((targetLocale) => {
            const isSelected = locale === targetLocale

            return (
              <Button
                key={targetLocale}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "ghost"}
                className="min-w-0 flex-1 rounded-lg"
                onClick={() => setLocale(targetLocale)}
              >
                {t(`locale.${targetLocale}`)}
              </Button>
            )
          })}
        </div>
      </section>

      <section className="space-y-2.5">
        <Label className="text-xs text-muted-foreground">{t("settings.displayMode")}</Label>
        <div
          data-slot="button-group"
          className="inline-flex rounded-xl border border-border/70 bg-muted/35 p-1"
        >
          {MODE_OPTIONS.map(({ value, icon: Icon, labelKey }) => {
            const isSelected = selectedMode === value
            const label = t(labelKey)

            return (
              <Button
                key={value}
                type="button"
                size="icon-sm"
                variant={isSelected ? (value === "system" ? "secondary" : "default") : "ghost"}
                className="rounded-lg"
                aria-label={label}
                title={label}
                aria-pressed={isSelected}
                onClick={() => setTheme(value)}
              >
                <Icon className="size-4" />
              </Button>
            )
          })}
        </div>
      </section>

      <section className="space-y-2.5">
        <Label className="text-xs text-muted-foreground">{t("settings.themeColor")}</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_THEMES.map((themeOption) => {
            const isSelected = colorTheme === themeOption
            const label = t(COLOR_THEME_LABELS[themeOption])

            return (
              <Button
                key={themeOption}
                type="button"
                size="icon-sm"
                variant={isSelected ? "secondary" : "ghost"}
                className={cn(
                  "relative rounded-full border border-transparent bg-transparent",
                  isSelected &&
                    "border-border/80 ring-2 ring-ring/60 ring-offset-2 ring-offset-popover",
                )}
                aria-label={label}
                title={label}
                aria-pressed={isSelected}
                onClick={() => setColorTheme(themeOption)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative flex size-4 items-center justify-center rounded-full border border-black/10 shadow-sm transition-transform dark:border-white/15",
                    COLOR_SWATCH_CLASSNAMES[themeOption],
                    isSelected ? "scale-110" : "scale-100",
                  )}
                >
                  {isSelected ? <span className="size-1.5 rounded-full bg-background/95" /> : null}
                </span>
              </Button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
