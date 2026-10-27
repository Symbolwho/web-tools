import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "next-themes"
import App from "./App.tsx"
import "./index.css"
import { I18nProvider } from "./lib/i18n"
import { ThemeColorProvider } from "./lib/theme"

// Prevent browser zoom on pinch gestures (Mac trackpad, mobile)
document.addEventListener(
  "gesturestart",
  (e) => {
    e.preventDefault()
  },
  { passive: false }
)
document.addEventListener(
  "gesturechange",
  (e) => {
    e.preventDefault()
  },
  { passive: false }
)
document.addEventListener(
  "gestureend",
  (e) => {
    e.preventDefault()
  },
  { passive: false }
)

// Prevent Ctrl/Cmd + wheel zoom on the page (we handle it per-component)
document.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
    }
  },
  { passive: false }
)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      storageKey="web-tools:mode"
    >
      <ThemeColorProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeColorProvider>
    </ThemeProvider>
  </StrictMode>
)
