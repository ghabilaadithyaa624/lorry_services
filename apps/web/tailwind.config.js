/**
 * LorryCarry Tailwind configuration.
 *
 * Theming strategy
 * ────────────────
 * Semantic colours resolve through CSS custom properties defined in
 * `globals.css`, so a single set of utilities renders correctly in both light
 * and dark themes. Prefer the semantic names in new code:
 *
 *   Surfaces : bg-canvas · bg-panel · bg-sunken · bg-overlay
 *   Text     : text-ink · text-body · text-muted · text-subtle
 *   Lines    : border-hairline · border-hairline-strong · bg-wash
 *
 * The legacy `surface-*` scale is intentionally mapped onto the same variables
 * so the large existing codebase inverts with the theme instead of staying
 * hardcoded dark. Numeric steps keep their original *semantic role*
 * (e.g. surface-400 = secondary text, surface-950 = deepest surface) rather
 * than a fixed slate value.
 */

/** Build an rgb() colour that supports Tailwind's opacity modifier. */
const withOpacity = (variable) => ({ opacityValue }) =>
  opacityValue === undefined
    ? `rgb(var(${variable}))`
    : `rgb(var(${variable}) / ${opacityValue})`

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Primary (LorryCarry orange) — theme-invariant brand accent ──
        primary: {
          DEFAULT: '#F97316',
          50:  '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          950: '#431407',
        },

        // ══ Semantic theme-aware tokens (preferred in new code) ══
        canvas: withOpacity('--lc-canvas'),
        panel: withOpacity('--lc-panel'),
        sunken: withOpacity('--lc-sunken'),
        overlay: withOpacity('--lc-overlay'),
        elevated: withOpacity('--lc-elevated'),

        ink: withOpacity('--lc-ink'),
        body: withOpacity('--lc-body'),
        muted: withOpacity('--lc-muted'),
        subtle: withOpacity('--lc-subtle'),

        brand: withOpacity('--lc-brand'),
        'on-brand': withOpacity('--lc-on-brand'),

        /**
         * Legacy `surface-*` scale — SURFACE (background/border) semantics.
         * A dedicated text scale is declared under `textColor` below, because
         * the same numeric step means opposite things for fills vs. glyphs
         * (e.g. `bg-surface-900` = dark panel, `text-surface-900` = dark ink).
         */
        surface: {
          50:  withOpacity('--lc-sunken'),
          100: withOpacity('--lc-sunken'),
          200: withOpacity('--lc-sunken'),
          300: withOpacity('--lc-muted'),
          400: withOpacity('--lc-muted'),
          500: withOpacity('--lc-subtle'),
          600: withOpacity('--lc-muted'),
          700: withOpacity('--lc-sunken'),
          800: withOpacity('--lc-sunken'),
          900: withOpacity('--lc-panel'),
          950: withOpacity('--lc-sunken'),
        },

        success: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          950: '#052E16',
        },
        danger: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          950: '#450A0A',
        },
        warning: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          950: '#451A03',
        },
        info: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          950: '#172554',
        },

        whatsapp: '#25D366',
        verified: '#16A34A',
        urgency: '#DC2626',

        background: {
          light: '#F8FAFC',
          dark:  '#070A11',
        },
        text: {
          light: '#0F172A',
          dark:  '#F1F5F9',
        },
      },

      /**
       * Theme-aware border colours. `border-white/10` in legacy markup is
       * remapped below via `borderOpacity`-compatible tokens; new code should
       * use `border-hairline`.
       */
      borderColor: ({ theme }) => ({
        ...theme('colors'),
        DEFAULT: 'rgb(var(--lc-hairline) / 0.10)',
        hairline: 'rgb(var(--lc-hairline) / 0.10)',
        'hairline-strong': 'rgb(var(--lc-hairline) / 0.18)',
        /**
         * Legacy escape hatch: `border-white/N` is used ~550 times in existing
         * markup. Mapping `white` to the hairline variable keeps those call
         * sites working and theme-correct without a risky mass rewrite.
         */
        white: withOpacity('--lc-hairline'),
      }),

      backgroundColor: ({ theme }) => ({
        ...theme('colors'),
        wash: 'rgb(var(--lc-wash) / 0.06)',
        'wash-soft': 'rgb(var(--lc-wash) / 0.04)',
        'wash-strong': 'rgb(var(--lc-wash) / 0.10)',
        /**
         * Legacy `bg-white/5`-style interaction washes. In light mode a white
         * wash is invisible; mapping to the wash variable makes hover states
         * work in both themes.
         */
        white: withOpacity('--lc-wash'),
      }),

      divideColor: ({ theme }) => ({
        ...theme('colors'),
        white: withOpacity('--lc-hairline'),
      }),

      /**
       * Theme-aware TEXT scale.
       *
       * Legacy markup uses `text-surface-400` for secondary copy and
       * `text-surface-900` for headings — opposite ends of a dark-mode ramp.
       * Mapping them by *role* (not by lightness) keeps ~700 existing call
       * sites legible in both themes:
       *   100-200 → body      400-500 → secondary/meta
       *   300     → muted     600-950 → primary ink
       *
       * `text-white` is deliberately NOT remapped: it is used almost entirely
       * on saturated brand/semantic fills (orange buttons, coloured badges)
       * where white is correct in both themes.
       */
      textColor: ({ theme }) => ({
        ...theme('colors'),
        ink: withOpacity('--lc-ink'),
        body: withOpacity('--lc-body'),
        muted: withOpacity('--lc-muted'),
        subtle: withOpacity('--lc-subtle'),
        surface: {
          50:  withOpacity('--lc-body'),
          100: withOpacity('--lc-body'),
          200: withOpacity('--lc-body'),
          300: withOpacity('--lc-muted'),
          400: withOpacity('--lc-muted'),
          500: withOpacity('--lc-subtle'),
          600: withOpacity('--lc-muted'),
          700: withOpacity('--lc-body'),
          800: withOpacity('--lc-ink'),
          900: withOpacity('--lc-ink'),
          950: withOpacity('--lc-ink'),
        },
      }),

      ringOffsetColor: ({ theme }) => ({
        ...theme('colors'),
        DEFAULT: 'rgb(var(--lc-ring-offset))',
      }),

      fontFamily: {
        sans:    ['var(--font-inter)', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-geist-mono)', 'Geist Mono', 'JetBrains Mono', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      borderRadius: {
        'card':   '16px',
        'button': '10px',
        'input':  '10px',
        'panel':  '20px',
        'modal':  '24px',
        'badge':  '8px',
        'pill':   '9999px',
      },

      /**
       * Shadows are tuned per theme via --lc-shadow-color/strength so cards
       * read as elevated on white without becoming heavy smudges on dark.
       */
      boxShadow: {
        'xs':         '0 1px 2px 0 rgb(var(--lc-shadow-color) / calc(var(--lc-shadow-strength) * 0.6))',
        'card':       '0 1px 2px 0 rgb(var(--lc-shadow-color) / calc(var(--lc-shadow-strength) * 0.7)), 0 1px 3px 0 rgb(var(--lc-shadow-color) / calc(var(--lc-shadow-strength) * 0.5))',
        'card-hover': '0 4px 12px -2px rgb(var(--lc-shadow-color) / var(--lc-shadow-strength)), 0 2px 6px -2px rgb(var(--lc-shadow-color) / calc(var(--lc-shadow-strength) * 0.7))',
        'elevated':   '0 8px 24px -4px rgb(var(--lc-shadow-color) / var(--lc-shadow-strength)), 0 4px 8px -4px rgb(var(--lc-shadow-color) / calc(var(--lc-shadow-strength) * 0.6))',
        'modal':      '0 20px 50px -12px rgb(var(--lc-shadow-color) / calc(var(--lc-shadow-strength) * 2.2))',
        'glow-primary': '0 4px 14px -4px rgb(249 115 22 / 0.4)',
        'inner-light':  'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },

      backdropBlur: {
        'xs': '2px',
      },

      spacing: {
        '4.5': '1.125rem',
        '18':  '4.5rem',
        '88':  '22rem',
        '128': '32rem',
      },

      maxWidth: {
        '8xl': '88rem',
      },

      animation: {
        'fade-in':        'fadeIn 0.3s ease-out',
        'fade-in-up':     'fadeInUp 0.4s ease-out',
        'fade-in-down':   'fadeInDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left':  'slideInLeft 0.3s ease-out',
        'scale-in':       'scaleIn 0.2s ease-out',
        'shimmer':        'shimmer 2s infinite linear',
        'pulse-soft':     'pulseSoft 2s ease-in-out infinite',
        'bounce-in':      'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'spin-slow':      'spin 3s linear infinite',
        'toast-in':       'toastIn 0.4s ease-out',
        'toast-out':      'toastOut 0.3s ease-in forwards',
      },

      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.7' },
        },
        bounceIn: {
          '0%':   { opacity: '0', transform: 'scale(0.3)' },
          '50%':  { transform: 'scale(1.05)' },
          '70%':  { transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        toastIn: {
          '0%':   { opacity: '0', transform: 'translateY(-100%) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        toastOut: {
          '0%':   { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-100%) scale(0.95)' },
        },
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}
