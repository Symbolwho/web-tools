import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "next-themes"
import App from "./App.tsx"
import "./index.css"
import { I18nProvider } from "./lib/i18n"
import { ThemeColorProvider } from "./lib/theme"

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
