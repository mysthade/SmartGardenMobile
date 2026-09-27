import type { Config } from 'tailwindcss';

const rgb = (token: string) => `rgb(var(${token}) / <alpha-value>)`;

const preset = {
  darkMode: 'class' as const,
  theme: {
    extend: {
      colors: {
        bg: rgb('--bg'),
        surface: {
          DEFAULT: rgb('--surface'),
          elevated: rgb('--surface'),
          2: rgb('--surface-2'),
          3: rgb('--surface-3'),
        },
        line: {
          DEFAULT: rgb('--line'),
          strong: rgb('--line-strong'),
        },
        // Primary text token (prefer text-ink / text-fg). `text` key → text-text.
        ink: {
          DEFAULT: rgb('--text'),
          muted: rgb('--muted'),
        },
        muted: rgb('--muted'),
        faint: rgb('--faint'),
        leaf: {
          DEFAULT: rgb('--leaf'),
          hover: rgb('--leaf-hover'),
          soft: rgb('--leaf-soft'),
          deep: rgb('--leaf-hover'),
        },
        harvest: {
          DEFAULT: rgb('--harvest'),
          soft: rgb('--harvest-soft'),
        },
        'amber-ink': rgb('--amber-ink'),
        rain: {
          DEFAULT: rgb('--rain'),
          soft: rgb('--rain-soft'),
        },
        danger: {
          DEFAULT: rgb('--danger'),
          soft: rgb('--danger-soft'),
        },
        sow: rgb('--sow'),
        grow: rgb('--grow'),
        today: rgb('--today'),
        'on-today': rgb('--on-today'),
        'on-leaf': rgb('--on-leaf'),
        'on-harvest': rgb('--on-harvest'),
        'on-rain': rgb('--on-leaf'),
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
          6: 'var(--chart-6)',
        },
        // Compat aliases (map to new semantics)
        canvas: {
          DEFAULT: rgb('--bg'),
          muted: rgb('--surface-2'),
        },
        sage: {
          DEFAULT: rgb('--muted'),
          soft: rgb('--surface-2'),
        },
        terracotta: {
          DEFAULT: rgb('--harvest'),
          soft: rgb('--harvest-soft'),
        },
        sun: {
          DEFAULT: rgb('--harvest'),
          soft: rgb('--harvest-soft'),
        },
        soil: {
          DEFAULT: rgb('--muted'),
        },
        glass: {
          DEFAULT: rgb('--rain'),
          soft: rgb('--rain-soft'),
        },
        bloom: {
          DEFAULT: rgb('--bloom'),
          soft: rgb('--surface-2'),
        },
        field: {
          DEFAULT: rgb('--grow'),
          soft: rgb('--leaf-soft'),
        },
        success: {
          DEFAULT: rgb('--leaf'),
        },
        warning: {
          DEFAULT: rgb('--harvest'),
        },
        info: {
          DEFAULT: rgb('--rain'),
        },
        border: rgb('--line'),
        ring: rgb('--leaf'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Onest', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'Literata', 'Georgia', 'serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '8px',
        lg: '14px',
        xl: '14px',
        '2xl': '22px',
        '3xl': '22px',
        pill: '9999px',
      },
      maxWidth: {
        shell: '90rem',
        content: '72rem',
      },
      boxShadow: {
        // Shadows forbidden on cards; pop only for menus / modals / toasts
        none: 'none',
        soft: 'none',
        card: 'none',
        glow: 'none',
        pop: 'var(--shadow-pop)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'bar-grow': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        'fill-up': {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in var(--motion-slow) ease-out',
        'scale-in': 'scale-in var(--motion-base) ease-out',
      },
    },
  },
} satisfies Omit<Config, 'content'>;

export default preset;
