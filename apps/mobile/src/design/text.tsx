// text.tsx — the app's Text and TextInput: Pretendard unless told otherwise.
//
// RN has no global default font, so every screen imports these instead of the
// react-native originals. A style with its own fontFamily (the serif, a
// mono face) is left alone; everything else gets the Pretendard face that
// matches its fontWeight. Each weight is a separate static family, so the
// weight is resolved here rather than trusted to iOS family matching.
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { FONT } from "./mobile-tokens";

function face(weight: TextStyle["fontWeight"]): string {
  const w = weight === "bold" ? 700 : Number(weight) || 400;
  return w >= 700 ? FONT.bold : w >= 600 ? FONT.semibold : w >= 500 ? FONT.medium : FONT.regular;
}

/** The style with a Pretendard face added when it names no family. */
export function withUiFont(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  if (flat?.fontFamily) return style;
  return [style, { fontFamily: face(flat?.fontWeight) }];
}

export function Text({ style, ...rest }: TextProps) {
  return <RNText {...rest} style={withUiFont(style)} />;
}

export function TextInput({ style, ...rest }: TextInputProps & { ref?: React.Ref<RNTextInput> }) {
  return <RNTextInput {...rest} style={withUiFont(style)} />;
}
/** Instance type, so `useRef<TextInput>(null)` keeps working after the swap. */
// eslint-disable-next-line @typescript-eslint/no-redeclare -- value + type pair, like RN's own
export type TextInput = RNTextInput;
