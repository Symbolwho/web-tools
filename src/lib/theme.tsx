/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export const COLOR_THEMES = ["blue", "zinc", "green", "rose"] as const

export type ColorTheme = (typeof COLOR_THEMES)[number]

type ThemeColorContextValue = {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const COLOR_THEME_STORAGE_KEY = "web-tools:color-theme"
const DEFAULT_COLOR_THEME: ColorTheme = "blue"

const ThemeColorContext = createContext<ThemeColorContextValue | null>(null)

function isColorTheme(value: string | null): value is ColorTheme {
  return COLOR_THEMES.some((theme) => theme === value)
}

function getInitialColorTheme(): ColorTheme {
  if (typeof window === "undefined") return DEFAULT_COLOR_THEME

  const stored = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY)
  return isColorTheme(stored) ? stored : DEFAULT_COLOR_THEME
}

export function ThemeColorProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(getInitialColorTheme)

  useEffect(() => {
    window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, colorTheme)
    document.documentElement.dataset.colorTheme = colorTheme
  }, [colorTheme])

  const value = useMemo<ThemeColorContextValue>(
    () => ({
      colorTheme,
      setColorTheme,
    }),
    [colorTheme],
  )

  return createElement(ThemeColorContext.Provider, { value }, children)
}

export function useThemeColor() {
  const context = useContext(ThemeColorContext)

  if (!context) {
    throw new Error("useThemeColor must be used within ThemeColorProvider")
  }

  return context
}
