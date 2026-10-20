// Web-only touches (writing surfaces, switches). React Native's types don't
// know these, so they live here, cast once.
import { Platform, type TextStyle } from 'react-native';

const web = Platform.OS === 'web';

/** The page is the paper: no browser focus ring around the writing. */
export const noFocusRing = (web ? { outlineStyle: 'none' } : {}) as TextStyle;

/** Web textareas start two rows tall; a line starts as one. Spread onto a multiline TextInput. */
export const oneRowOnWeb = (web ? { rows: 1 } : {}) as object;

/**
 * React Native Web reads `blurOnSubmit`, not `submitBehavior`: without this a
 * multiline field's Return adds a line on web. With it, Return calls
 * `onSubmitEditing` (and blurs, unless that moved focus); Shift+Return still
 * adds a line. Spread onto a multiline TextInput that sets `submitBehavior`.
 */
export const submitOnReturnWeb = (web ? { blurOnSubmit: true } : {}) as object;

/** React Native Web paints a switch's knob teal while on unless told otherwise. Spread onto a Switch. */
export const switchThumbOnWeb = (color: string) => (web ? { activeThumbColor: color } : {}) as object;
