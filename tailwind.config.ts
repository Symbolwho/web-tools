import type { Config } from "tailwindcss"

const color = (token: string) => `oklch(var(${token}) / <alpha-value>)`

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: color("--border"),
        input: color("--input"),
        ring: color("--ring"),
        background: color("--background"),
        foreground: color("--foreground"),
        primary: {
          DEFAULT: color("--primary"),
          foreground: color("--primary-foreground"),
        },
        secondary: {
          DEFAULT: color("--secondary"),
          foreground: color("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: color("--destructive"),
          foreground: color("--destructive-foreground"),
        },
        muted: {
          DEFAULT: color("--muted"),
          foreground: color("--muted-foreground"),
        },
        accent: {
          DEFAULT: color("--accent"),
          foreground: color("--accent-foreground"),
        },
        popover: {
          DEFAULT: color("--popover"),
          foreground: color("--popover-foreground"),
        },
        card: {
          DEFAULT: color("--card"),
          foreground: color("--card-foreground"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config
