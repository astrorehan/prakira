import type { Config } from "tailwindcss";

/**
 * PRAKIRA Design System — "Buletin"
 * Spec: docs/DESIGN-SYSTEM.md
 *
 * Rules enforced here:
 *  - Neutrals are a custom low-chroma ramp tinted toward the brand hue (~192deg),
 *    never Tailwind's stock `slate`. This is what makes the surface read as paper.
 *  - Saturation is reserved for risk. Brand, surfaces and nav speak in neutrals.
 *  - Risk fills descend monotonically in lightness so the ordinal survives
 *    grayscale, color blindness and print.
 *  - Legacy aliases (primary-*, risk-*, shadow-glass-*) are kept so existing
 *    components repaint without edits. They are deprecated — see DESIGN-SYSTEM.md §10.4.
 */

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", lg: "2rem" },
      screens: { "2xl": "1240px" },
    },
    extend: {
      colors: {
        /* ── Neutrals: "Kertas" ramp, hue ~192deg, chroma 2–6% ─────────── */
        paper: {
          0: "#FFFFFF",
          50: "#F5F7F7",
          100: "#ECF0F0",
          200: "#DFE6E6",
          300: "#C9D4D4",
          400: "#A3B2B3",
          500: "#7C8D8F",
          600: "#5A6C6E",
          700: "#3D4E50",
          800: "#24373A",
          900: "#0E2225",
        },

        /* ── Brand: "Petrol" — climate + clinical, not SaaS blue ────────── */
        brand: {
          DEFAULT: "#0B4A57",
          50: "#EAF4F5",
          100: "#D6E9EC",
          300: "#7FB8C0",
          500: "#17808F",
          600: "#0F5F6E",
          700: "#0B4A57",
          800: "#093843",
          900: "#06282F",
          foreground: "#FFFFFF",
        },

        /* ── Public surface: "Kabut" — the public/warga side ────────────────
           Was warm sand. Now a cool low-chroma tint at the brand hue, one step
           bluer than `paper` so the two surfaces still read apart without
           using temperature to do it. See DESIGN-SYSTEM.md §2.6 and §3. */
        sand: {
          DEFAULT: "#E3EDF4",
          50: "#EFF5F9",
          100: "#E3EDF4",
          200: "#CFDFE9",
          300: "#AFC6D5",
        },

        /* ── Risk ramp: Earth-tone status palette (Surplus, Cukup, Waspada, Defisit) ── */
        risk: {
          low: "#1F5132",
          "low-bg": "#EDF4EC",
          "low-br": "#C5DEC2",
          "low-fill": "#7AA876",

          medium: "#D4933A",
          "medium-bg": "#FDF6E9",
          "medium-br": "#F6DBA9",
          "medium-fill": "#E5AA52",

          high: "#A8442C",
          "high-bg": "#FBECE8",
          "high-br": "#F3C2B4",
          "high-fill": "#C95E42",

          critical: "#8A2E1A",
          "critical-bg": "#F9DFD8",
          "critical-br": "#E8A28E",
          "critical-fill": "#A8442C",

          none: "#5A6C6E",
          "none-bg": "#ECF0F0",
          "none-br": "#DFE6E6",
          "none-fill": "#E3E8E8",
        },

        /* ── Categorical: charts only. Never encodes risk. ──────────────── */
        cat: {
          1: "#0B4A57",
          2: "#7A5C2E",
          3: "#47617F",
          4: "#5B4A70",
          5: "#2C6650",
        },

        /* ── Climate variables: fixed encoding across the whole product ─── */
        climate: {
          rain: "#2E6F8E",
          temp: "#B4552A",
          humid: "#4E8C7E",
        },

        /* ── Semantic slots (shadcn-compatible) ─────────────────────────── */
        background: "#F5F7F7",
        surface: "#FFFFFF",
        foreground: "#0E2225",
        muted: { DEFAULT: "#ECF0F0", foreground: "#5A6C6E" },
        border: "#DFE6E6",
        input: "#DFE6E6",
        ring: "#0B4A57",
        card: { DEFAULT: "#FFFFFF", foreground: "#0E2225" },
        popover: { DEFAULT: "#FFFFFF", foreground: "#0E2225" },
        accent: { DEFAULT: "#D6E9EC", foreground: "#0B4A57" },
        secondary: { DEFAULT: "#ECF0F0", foreground: "#24373A" },
        destructive: { DEFAULT: "#DC2626", foreground: "#FFFFFF" },

        /* ── Legacy aliases — repoint old class names onto new values ──────
           Deprecated. Do not use in new code; migrate to brand-* / paper-*. */
        primary: {
          DEFAULT: "#0B4A57",
          foreground: "#FFFFFF",
          deep: "#093843",
          dark: "#06282F",
          soft: "#D6E9EC",
          light: "#EAF4F5",
          accent: "#17808F",
          royal: "#0B4A57",
        },
        clay: "#7A5C2E",
      },

      borderRadius: {
        none: "0",
        xs: "4px",
        sm: "6px",
        DEFAULT: "8px",
        md: "8px",
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
      },

      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Label role, not a second typeface: `font-mono` now resolves to Inter
        // with tabular figures. Kept as a token so existing call sites hold.
        mono: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Legacy alias — display has no separate typeface by design.
        display: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      fontSize: {
        /* Rungs below Tailwind's own `xs` (0.75rem). The micro-labels on the
           data surface live here — before these existed the scale bottomed out
           at `overline` (0.6875rem) and 160 call sites reached for arbitrary
           px instead. Fixed px does not respond to the root font-size, so the
           a11y text-size control moved the page around them; see globals.css
           `html.a11y-large-text` and DESIGN-SYSTEM.md §7.

           Deliberately size-only: no letterSpacing, no fontWeight. Unlike
           `overline` these carry no role, so they must not impose tracking on
           the third of their call sites that are not upper-case mono labels.
           Values are the old px divided by 18 — the 112.5% root — so the swap
           is visually identical. */
        "5xs": ["0.4444rem", { lineHeight: "1.4" }],
        "4xs": ["0.5rem", { lineHeight: "1.4" }],
        "3xs": ["0.5556rem", { lineHeight: "1.4" }],
        "2xs": ["0.6111rem", { lineHeight: "1.45" }],
        overline: ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "500" }],
        caption: ["0.8125rem", { lineHeight: "1.45" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55" }],
        body: ["0.9375rem", { lineHeight: "1.6" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.65" }],
        h3: ["1.125rem", { lineHeight: "1.35", letterSpacing: "-0.012em", fontWeight: "600" }],
        h2: ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.018em", fontWeight: "600" }],
        h1: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" }],
        display: [
          "clamp(2.25rem, 1.6rem + 2.6vw, 3.5rem)",
          { lineHeight: "1.04", letterSpacing: "-0.022em", fontWeight: "600" },
        ],
        "metric-sm": ["1.375rem", { lineHeight: "1.1", letterSpacing: "-0.01em", fontWeight: "600" }],
        metric: ["2rem", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "600" }],
        "metric-xl": ["2.5rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "600" }],
      },

      /* Shadows are tinted with brand ink (#0E2225), never pure black. */
      boxShadow: {
        hairline: "0 0 0 1px rgba(14,34,37,.06)",
        xs: "0 1px 1px rgba(14,34,37,.04)",
        sm: "0 1px 2px rgba(14,34,37,.05), 0 1px 1px rgba(14,34,37,.03)",
        card: "0 1px 2px rgba(14,34,37,.04), 0 8px 20px -10px rgba(14,34,37,.10)",
        lift: "0 2px 4px rgba(14,34,37,.04), 0 18px 36px -14px rgba(14,34,37,.16)",
        pop: "0 4px 8px rgba(14,34,37,.06), 0 28px 56px -20px rgba(14,34,37,.22)",
        focus: "0 0 0 2px #FFFFFF, 0 0 0 4px rgba(11,74,87,.55)",

        // Legacy aliases — flattened onto the new scale so nothing glows.
        elevated: "0 2px 4px rgba(14,34,37,.04), 0 18px 36px -14px rgba(14,34,37,.16)",
        glow: "0 1px 2px rgba(14,34,37,.04), 0 8px 20px -10px rgba(14,34,37,.10)",
        glass: "0 1px 2px rgba(14,34,37,.04), 0 8px 20px -10px rgba(14,34,37,.10)",
        "glass-sm": "0 1px 2px rgba(14,34,37,.05), 0 1px 1px rgba(14,34,37,.03)",
        "glass-md": "0 1px 2px rgba(14,34,37,.04), 0 8px 20px -10px rgba(14,34,37,.10)",
        "glass-lg": "0 2px 4px rgba(14,34,37,.04), 0 18px 36px -14px rgba(14,34,37,.16)",
      },

      transitionTimingFunction: {
        out: "cubic-bezier(.2,.7,.3,1)",
        inout: "cubic-bezier(.5,0,.2,1)",
      },
      transitionDuration: {
        fast: "140ms",
        base: "200ms",
        slow: "320ms",
      },

      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms cubic-bezier(.2,.7,.3,1) both",
        "fade-in-up": "fade-in-up 320ms cubic-bezier(.2,.7,.3,1) both",
        "pulse-dot": "pulse-dot 2s cubic-bezier(.5,0,.2,1) infinite",
        // Legacy aliases retired to no-ops so old classes stop floating things.
        float: "fade-in 200ms cubic-bezier(.2,.7,.3,1) both",
        "pulse-slow": "pulse-dot 2s cubic-bezier(.5,0,.2,1) infinite",
      },

      backgroundImage: {
        /* A single soft atmospheric wash. One layer, low alpha, no dot grid
           fighting it — the previous version had a weak mesh under a loud grid. */
        wash:
          "radial-gradient(1200px 520px at 8% -8%, rgba(11,74,87,.10) 0%, transparent 62%), radial-gradient(900px 460px at 92% 4%, rgba(23,128,143,.07) 0%, transparent 58%)",
        "wash-warm":
          "radial-gradient(1200px 520px at 8% -8%, rgba(127,184,192,.22) 0%, transparent 62%), radial-gradient(900px 460px at 92% 4%, rgba(11,74,87,.05) 0%, transparent 58%)",
        /* ── Gradients ─────────────────────────────────────────────────────
           Every gradient is built from tokens already in this file, so they
           stay inside the palette instead of introducing new hues. Risk
           gradients keep the same lightness order as the flat risk ramp. */
        "grad-page":
          "radial-gradient(1100px 620px at 12% -10%, rgba(127,184,192,.28) 0%, transparent 62%), radial-gradient(900px 520px at 92% 8%, rgba(11,74,87,.10) 0%, transparent 60%), linear-gradient(180deg, #FFFFFF 0%, #EFF5F9 100%)",
        "grad-sand": "linear-gradient(180deg, #EFF5F9 0%, #E3EDF4 100%)",
        "grad-paper": "linear-gradient(180deg, #FFFFFF 0%, #F5F7F7 100%)",
        "grad-brand": "linear-gradient(135deg, #17808F 0%, #0B4A57 52%, #06282F 100%)",
        "grad-brand-soft": "linear-gradient(135deg, #EAF4F5 0%, #D6E9EC 60%, #FFFFFF 100%)",

        "grad-risk-high":
          "linear-gradient(158deg, #F9DFD8 0%, #FBECE8 42%, #FFFFFF 100%)",
        "grad-risk-medium":
          "linear-gradient(158deg, #FAECCF 0%, #FDF6E9 42%, #FFFFFF 100%)",
        "grad-risk-low":
          "linear-gradient(158deg, #DDEBDA 0%, #EDF4EC 42%, #FFFFFF 100%)",

        "grad-bar-high": "linear-gradient(90deg, #E08A6E 0%, #C95E42 58%, #A8442C 100%)",
        "grad-bar-medium": "linear-gradient(90deg, #F2C67F 0%, #E5AA52 58%, #D4933A 100%)",
        "grad-bar-low": "linear-gradient(90deg, #A5C79F 0%, #7AA876 58%, #4A7C4E 100%)",

        hatch:
          "repeating-linear-gradient(45deg, rgba(255,255,255,.32) 0 2px, transparent 2px 6px)",

        // Legacy aliases.
        "mesh-blue":
          "radial-gradient(1200px 520px at 8% -8%, rgba(11,74,87,.10) 0%, transparent 62%), radial-gradient(900px 460px at 92% 4%, rgba(23,128,143,.07) 0%, transparent 58%)",
        "grid-light": "none",
        "grid-dot": "none",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
