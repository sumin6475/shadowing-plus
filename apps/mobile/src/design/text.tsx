// text.tsx — the app's Text and TextInput share native system typography.
//
// Keep fontWeight native so Korean, English and mixed-script copy have the
// same hierarchy. Explicit per-use styles can still override the base style.
import {
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { FONT_UI } from "./mobile-tokens";

/** The native family is the default; explicit styles keep their precedence. */
export function withUiFont(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  return [{ fontFamily: FONT_UI }, style];
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
