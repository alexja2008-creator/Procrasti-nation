// A2 · Vintage Passport, refined. Chosen 2026-09-30; source of truth for color,
// type, spacing, radii and motion on iOS and web. Light is "day passport",
// night is "night passport" (navy leather, gold accents).

export type Scheme = 'light' | 'night';

export interface Palette {
  /** Page ground, drawn under the security-line texture. */
  bg: string;
  /** The faint 135° security lines over `bg`. */
  securityLine: string;
  ink: string;
  /** Secondary body copy (MRZ line, Start Mode explainer). */
  inkSoft: string;
  /** Captions and meta. Keeps ≥4.5:1 on `bg`. */
  muted: string;
  /** Small decorative accent: the sun on Today, foil details at night. */
  accent: string;

  primary: string;
  /** Primary used as text on light grounds (darker than `primary` for contrast). */
  primaryText: string;
  onPrimary: string;

  card: string;
  /** Passport ID page. */
  page: string;
  pageBorder: string;
  /** Hairline rules between rows. */
  rule: string;
  /** Count chips, duration chips, timer track. */
  chip: string;
  /** Pills and secondary-button outlines. */
  outline: string;
  /** The dashed Customs banner border. */
  dashed: string;
  /** Unchecked checkbox ring. */
  checkbox: string;
  /** Text inputs and secondary buttons. Border keeps ≥3:1 against `card`. */
  field: { bg: string; border: string };
  /** Validation and failure copy. */
  error: string;
  /** Dims the page behind sheets and dialogs. */
  scrim: string;
  /** Sign in with Apple: black on light grounds, white on dark (Apple HIG). */
  apple: { bg: string; fg: string };

  /** "Your next small step" ticket. */
  next: { bg: string; border: string; stub: string; meta: string };

  tabBar: { bg: string; border: string };

  stamp: { terracotta: string; violet: string; forest: string };
}

export const palettes: Record<Scheme, Palette> = {
  light: {
    bg: '#F5F1E8',
    securityLine: 'rgba(35,42,69,0.025)',
    ink: '#232A45',
    inkSoft: '#4A4F63',
    muted: '#5C6070',
    accent: '#9A7B3C',
    primary: '#3A6B52',
    primaryText: '#2F5A44',
    onPrimary: '#FFFFFF',
    card: '#FBF8F1',
    page: '#EFE8D8',
    pageBorder: '#D8CDB5',
    rule: '#DDD4C2',
    chip: '#ECE5D6',
    outline: '#CFC4AE',
    dashed: '#A99C80',
    checkbox: '#8E8A7E',
    field: { bg: '#FBF8F1', border: '#8E8A7E' },
    error: '#A8513B',
    scrim: 'rgba(35,42,69,0.35)',
    apple: { bg: '#000000', fg: '#FFFFFF' },
    next: { bg: '#E4EADD', border: '#C9D5C0', stub: '#A9BFA6', meta: '#4A5A4E' },
    tabBar: { bg: '#ECE5D6', border: '#D8CDB5' },
    stamp: { terracotta: '#A8513B', violet: '#5E5D8F', forest: '#3A6B52' },
  },
  night: {
    bg: '#161B2E',
    securityLine: 'rgba(212,178,106,0.04)',
    ink: '#ECE6D8',
    inkSoft: '#C9C6BC',
    muted: '#A7AABB',
    accent: '#D4B26A',
    primary: '#7CC3A0',
    primaryText: '#9AD4B6',
    onPrimary: '#0F1F17',
    card: '#1E2440',
    // Not drawn in the canvas; inferred from the night card and rule colors.
    page: '#1B2139',
    pageBorder: '#2A3150',
    rule: '#2A3150',
    chip: '#10152A',
    outline: '#3A4163',
    dashed: '#5E6180',
    checkbox: '#8A8DA3',
    field: { bg: '#1E2440', border: '#8A8DA3' },
    error: '#E08A70',
    scrim: 'rgba(5,8,18,0.6)',
    apple: { bg: '#FFFFFF', fg: '#000000' },
    next: { bg: '#1D2B28', border: '#34503F', stub: '#4F7A63', meta: '#B5C4BA' },
    tabBar: { bg: '#10152A', border: '#2A3150' },
    // Only terracotta was drawn for night; violet is lightened to match it.
    stamp: { terracotta: '#E08A70', violet: '#A3A2D6', forest: '#7CC3A0' },
  },
};

/** Third-party marks whose colors are fixed by brand guidelines, not by A2. */
export const brandMarks = {
  google: { blue: '#4285F4', green: '#34A853', yellow: '#FBBC05', red: '#EA4335' },
} as const;

/**
 * Font family names. The app registers each loaded font file under exactly
 * these names, so pick the family for the weight you want and never combine it
 * with `fontWeight` (iOS falls back to the system font if you do).
 */
export const fonts = {
  display: 'Fraunces-Medium',
  displayItalic: 'Fraunces-MediumItalic',
  body: 'InstrumentSans-Regular',
  bodyMedium: 'InstrumentSans-Medium',
  bodySemibold: 'InstrumentSans-SemiBold',
  mono: 'IBMPlexMono-Regular',
  monoMedium: 'IBMPlexMono-Medium',
  /** Logo wordmark only. */
  logo: 'SpaceGrotesk-Bold',
} as const;

export type FontRole = keyof typeof fonts;

interface TextStyleToken {
  font: FontRole;
  size: number;
  lineHeight?: number;
  /** In px, as React Native expects (the canvas used em; 0.1em at 11px = 1.1). */
  letterSpacing?: number;
}

export const type = {
  title: { font: 'display', size: 36, lineHeight: 38, letterSpacing: -0.36 },
  pageTitle: { font: 'display', size: 29, lineHeight: 31, letterSpacing: -0.29 },
  section: { font: 'display', size: 21, lineHeight: 26 },
  step: { font: 'display', size: 20, lineHeight: 24.5 },
  lead: { font: 'body', size: 15, lineHeight: 21 },
  item: { font: 'bodyMedium', size: 15.5, lineHeight: 20 },
  body: { font: 'body', size: 14.5, lineHeight: 20 },
  meta: { font: 'body', size: 12.5, lineHeight: 16 },
  button: { font: 'bodySemibold', size: 13.5, lineHeight: 18 },
  tab: { font: 'bodyMedium', size: 11, lineHeight: 14 },
  label: { font: 'mono', size: 11, lineHeight: 14, letterSpacing: 1.1 },
  /** Smallest mono allowed (readability floor from the design review). */
  labelSmall: { font: 'mono', size: 10.5, lineHeight: 13, letterSpacing: 0.6 },
} satisfies Record<string, TextStyleToken>;

export type TypeRole = keyof typeof type;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radii = { chip: 4, sm: 6, md: 10, lg: 12, card: 14, pill: 999 } as const;

/** Minimum touch target (Apple HIG). */
export const hitTarget = 44;

export const motion = {
  /** Checkbox fill, chip press. */
  quick: 140,
  /** Sheets and cards. */
  standard: 240,
  /** The ink stamp landing on a finished task. */
  stamp: 420,
} as const;

/** Semantic haptics; the app maps these to expo-haptics calls. */
export const haptics = {
  complete: 'success',
  stamp: 'heavy',
  select: 'selection',
} as const;
