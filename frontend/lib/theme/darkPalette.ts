import colors from 'tailwindcss/colors';

// Dark mode without touching every component: the Tailwind colors the app uses
// (white, slate, the tinted accents) are read from CSS variables, separately for
// backgrounds, text and borders. The light values are Tailwind's own, so the
// light theme is unchanged; `.dark` on <html> swaps in the values below.
// A subtree marked `.theme-light` (printed documents) keeps the light values.

type Kind = 'bg' | 'text' | 'border';
type Shade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';
type Scale = Record<Shade, string>;

const SHADES: Shade[] = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const NEUTRALS = ['slate', 'gray', 'zinc', 'neutral', 'stone'] as const;
const ACCENTS = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
] as const;

const PAGE = '#0B1120';
const CARD = '#0F172A';

// Grays flip: light surfaces turn dark, dark text turns light. Shades left out
// (dark backgrounds such as overlays) keep their light-theme value.
const NEUTRAL_DARK: Record<Kind, Partial<Scale>> = {
  bg: { '50': '#162033', '100': '#1E293B', '200': '#273449', '300': '#334155', '400': '#475569', '500': '#64748B' },
  text: {
    '50': '#1E293B', '100': '#334155', '200': '#475569', '300': '#5B6A80', '400': '#7D8BA1', '500': '#94A3B8',
    '600': '#B6C2D2', '700': '#CBD5E1', '800': '#E2E8F0', '900': '#F1F5F9', '950': '#F8FAFC',
  },
  border: { '50': '#172033', '100': '#1C2638', '200': '#263247', '300': '#334155', '400': '#475569', '500': '#64748B' },
};

// Semantic colors from tailwind.config.ts, used by every utility.
const SEMANTIC: Record<string, { light: string; dark: string }> = {
  background: { light: '#F8FAFC', dark: PAGE },
  text: { light: '#0F172A', dark: '#F1F5F9' },
  'color-bg': { light: '#F8FAFC', dark: PAGE },
  'color-card': { light: '#FFFFFF', dark: CARD },
  'color-text-main': { light: '#0F172A', dark: '#F1F5F9' },
  'color-text-muted': { light: '#64748B', dark: '#94A3B8' },
  'color-border': { light: '#E2E8F0', dark: '#263247' },
  'color-input-bg': { light: '#FFFFFF', dark: '#111C30' },
  'color-soft-blue': { light: '#F0FDFA', dark: '#0F2A31' },
};

function rgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channels(hex: string) {
  return rgb(hex).join(' ');
}

// `amount` of `hex` laid over the dark card color.
function tint(hex: string, amount: number) {
  const [r, g, b] = rgb(hex);
  const [cr, cg, cb] = rgb(CARD);
  const mix = (a: number, c: number) => Math.round(a * amount + c * (1 - amount));
  return `#${[mix(r, cr), mix(g, cg), mix(b, cb)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Pale accent backgrounds and borders become faint tints; strong accent text
// becomes a lighter shade so it stays readable on dark surfaces.
function accentDark(kind: Kind, scale: Scale): Partial<Scale> {
  if (kind === 'text') {
    return { '500': scale['400'], '600': scale['400'], '700': scale['300'], '800': scale['200'], '900': scale['100'], '950': scale['100'] };
  }
  const amounts: Partial<Record<Shade, number>> =
    kind === 'bg' ? { '50': 0.1, '100': 0.16, '200': 0.24, '300': 0.38 } : { '50': 0.14, '100': 0.2, '200': 0.28, '300': 0.4 };
  return Object.fromEntries(Object.entries(amounts).map(([shade, amount]) => [shade, tint(scale['500'], amount!)]));
}

const varName = (kind: Kind, palette: string, shade: string) => `--tc-${kind}-${palette}-${shade}`;
const fromVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const lightVars: Record<string, string> = {};
const darkVars: Record<string, string> = {};

type ColorTree = Record<string, string | Record<string, string>>;

function themeColors(kind: Kind): ColorTree {
  const result: ColorTree = {};
  for (const palette of [...NEUTRALS, ...ACCENTS]) {
    const scale = colors[palette] as Scale;
    const dark = (NEUTRALS as readonly string[]).includes(palette) ? NEUTRAL_DARK[kind] : accentDark(kind, scale);
    result[palette] = Object.fromEntries(
      SHADES.map((shade) => {
        if (!dark[shade]) return [shade, scale[shade]];
        const name = varName(kind, palette, shade);
        lightVars[name] = channels(scale[shade]);
        darkVars[name] = channels(dark[shade]!);
        return [shade, fromVar(name)];
      }),
    );
  }

  // White text always stays white (it sits on solid brand buttons). A white
  // background or border turns dark, except faint white washes such as
  // `bg-white/10` on the teal brand panel, which keep their glassy look.
  if (kind !== 'text') {
    const name = `--tc-${kind}-white`;
    lightVars[name] = '255 255 255';
    darkVars[name] = channels(CARD);
    const white = ({ opacityValue }: { opacityValue?: string }) => {
      const alpha = Number(opacityValue);
      if (!Number.isNaN(alpha) && alpha < 0.5) return `rgb(255 255 255 / ${opacityValue})`;
      return `rgb(var(${name}) / ${opacityValue ?? 1})`;
    };
    // Tailwind accepts a function color but its config types only list strings.
    result.white = white as unknown as string;
  }

  if (kind === 'border') {
    // Preflight gives every element this border color.
    lightVars['--tc-border-default'] = channels(colors.gray['200']);
    darkVars['--tc-border-default'] = channels(NEUTRAL_DARK.border['200']!);
    result.DEFAULT = fromVar('--tc-border-default');
  }
  return result;
}

export const backgroundColor = themeColors('bg');
export const textColor = themeColors('text');
export const borderColor = themeColors('border');

export const semanticColors = Object.fromEntries(
  Object.entries(SEMANTIC).map(([key, { light, dark }]) => {
    lightVars[`--tc-${key}`] = channels(light);
    darkVars[`--tc-${key}`] = channels(dark);
    return [key, fromVar(`--tc-${key}`)];
  }),
);

// CSS for the plugin's addBase. Dark values apply on screen only, so printing
// from dark mode still produces a light page.
export const themeBase = {
  ':root': lightVars,
  '@media screen': {
    '.dark': { ...darkVars, colorScheme: 'dark' },
    '.dark .theme-light': { ...lightVars, colorScheme: 'light', color: SEMANTIC.text.light },
  },
};
