import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import {
  EnrichedTextInput,
  type EnrichedTextInputInstance,
} from "react-native-enriched-html";
import { Text } from "@/design/text";
import { FONT_UI } from "@/design/mobile-tokens";
import { useTheme } from "@/design/theme";
import { FOCUS_COPY, hasFocusText } from "@/lib/speaking-focus-copy";
import type { L1 } from "@/lib/first-language";
export interface FocusEditorHandle {
  html: () => Promise<string>;
  command: (command: "bold" | "bullet" | "number" | "clear" | "blur") => void;
}
export const SpeakingFocusEditor = forwardRef<
  FocusEditorHandle,
  {
    initialHtml: string;
    language: L1;
    disabled?: boolean;
    onFormatChange?: (
      state: { bold: boolean; bullet: boolean; number: boolean },
    ) => void;
    onChange: (text: string) => void;
    onFocusChange: (focused: boolean) => void;
  }
>(function SpeakingFocusEditor(
  { initialHtml, language, onChange, onFocusChange, disabled, onFormatChange },
  ref,
) {
  const t = useTheme(), input = useRef<EnrichedTextInputInstance>(null);
  const [empty, setEmpty] = useState(!initialHtml);
  const copy = FOCUS_COPY[language];
  useImperativeHandle(ref, () => ({
    html: async () => {
      const native = input.current;
      if (!native) throw new Error("The editor is not ready yet.");
      // Commit an active IME composition before asking the native editor for
      // its document. The placeholder is an overlay, never native content.
      native.blur();
      return await native.getHTML();
    },
    command: (command) => {
      if (command === "blur") {
        input.current?.blur();
        return;
      }
      if (command === "clear") {
        input.current?.setValue("");
        setEmpty(true);
        onChange("");
        return;
      }
      input.current?.focus();
      if (command === "bold") input.current?.toggleBold();
      else if (command === "bullet") input.current?.toggleUnorderedList();
      else input.current?.toggleOrderedList();
    },
  }), [onChange]);
  return (
    <View style={{ minHeight: 272 }}>
      {empty
        ? (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ position: "absolute", top: 2, left: 0, right: 0, gap: 16 }}
          >
            <Text
              style={{ fontSize: 16, lineHeight: 25, color: t.colors.ink3 }}
            >
              {copy.opening}
            </Text>
            <View style={{ gap: 7 }}>
              {copy.bullets.map((text) => (
                <View
                  key={text}
                  style={{ flexDirection: "row", gap: 9, paddingLeft: 7 }}
                >
                  <Text style={{ color: t.colors.ink3, fontSize: 16 }}>•</Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 16,
                      lineHeight: 25,
                      color: t.colors.ink3,
                    }}
                  >
                    {text}
                  </Text>
                </View>
              ))}
            </View>
            <Text
              style={{ fontSize: 16, lineHeight: 25, color: t.colors.ink3 }}
            >
              {copy.closing}
            </Text>
          </View>
        )
        : null}
      <EnrichedTextInput
        ref={input}
        editable={!disabled}
        defaultValue={initialHtml}
        scrollEnabled={false}
        linkRegex={null}
        accessibilityLabel="Speaking focus"
        accessibilityHint={copy.prompt}
        style={{
          fontFamily: FONT_UI,
          fontSize: 16,
          lineHeight: 25,
          color: t.colors.ink,
          backgroundColor: "transparent",
          minHeight: 272,
        }}
        onChangeState={(event) => {
          const s = event.nativeEvent;
          onFormatChange?.({
            bold: s.bold.isActive,
            bullet: s.unorderedList.isActive,
            number: s.orderedList.isActive,
          });
        }}
        onChangeText={(event) => {
          const value = event.nativeEvent.value;
          setEmpty(!hasFocusText(value));
          onChange(value);
        }}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
      />
    </View>
  );
});
