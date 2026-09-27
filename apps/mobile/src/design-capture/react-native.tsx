import React, { forwardRef, useContext, useEffect, useId, useMemo, useRef } from "react";
import * as RN from "react-native";
import { CaptureActiveContext, CaptureParentContext, removeCaptureNode, sanitizeCaptureValue, upsertCaptureNode, type CaptureSource } from "./registry";

interface CaptureInjectedProps {
  __rn2figmaSource?: CaptureSource;
}

function textContent(value: React.ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textContent).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(value)) return textContent(value.props.children);
  return "";
}

function sourceKey(source: CaptureSource | undefined): string {
  return source ? `${source.file}:${source.line}:${source.column}:${source.element}` : "unknown";
}

function assignRef(ref: React.ForwardedRef<unknown>, value: unknown): void {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function makeCaptureComponent(kind: string, NativeComponent: React.ComponentType<any>) {
  return forwardRef<any, any & CaptureInjectedProps>(function CapturedHost(inputProps, forwardedRef) {
    const { __rn2figmaSource, children, style, onLayout, ...props } = inputProps;
    const parentId = useContext(CaptureParentContext);
    const active = useContext(CaptureActiveContext);
    const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const id = useMemo(() => `rn-${sourceKey(__rn2figmaSource)}-${reactId}`, [__rn2figmaSource, reactId]);
    const nativeRef = useRef<any>(null);
    const latestStyle = useRef<unknown>(style);
    const measure = async () => new Promise<{ x: number; y: number; width: number; height: number } | null>((resolve) => {
      const target = nativeRef.current;
      if (!target || typeof target.measureInWindow !== "function") return resolve(null);
      target.measureInWindow((x: number, y: number, width: number, height: number) => {
        resolve([x, y, width, height].every(Number.isFinite) ? { x, y, width, height } : null);
      });
    });
    const register = () => {
      if (!active) {
        removeCaptureNode(id);
        return;
      }
      const flattened = RN.StyleSheet.flatten(latestStyle.current as any) ?? {};
      const capturedProps = kind === "Image"
        ? { sourceUri: inputProps.source?.uri }
        : kind === "Switch"
          ? { value: inputProps.value, trackColor: inputProps.trackColor, thumbColor: inputProps.thumbColor, ios_backgroundColor: inputProps.ios_backgroundColor }
          : undefined;
      upsertCaptureNode({
        id,
        parentId,
        kind,
        source: __rn2figmaSource,
        style: sanitizeCaptureValue(flattened) as Record<string, unknown>,
        ...(kind === "Text" ? { text: textContent(children) } : {}),
        ...(capturedProps ? { props: sanitizeCaptureValue(capturedProps) as Record<string, unknown> } : {}),
      }, measure);
    };
    useEffect(() => {
      if (active) register();
      else removeCaptureNode(id);
      return () => removeCaptureNode(id);
    });
    const resolvedStyle = typeof style === "function"
      ? (state: unknown) => {
          const value = style(state);
          latestStyle.current = value;
          register();
          return value;
        }
      : style;
    return (
      <CaptureParentContext.Provider value={id}>
        <NativeComponent
          {...props}
          ref={(value: unknown) => {
            nativeRef.current = value;
            assignRef(forwardedRef, value);
          }}
          style={resolvedStyle}
          collapsable={false}
          onLayout={(event: unknown) => {
            register();
            onLayout?.(event);
          }}
        >
          {children}
        </NativeComponent>
      </CaptureParentContext.Provider>
    );
  });
}

export const View = makeCaptureComponent("View", RN.View);
export const Text = makeCaptureComponent("Text", RN.Text);
export const Pressable = makeCaptureComponent("Pressable", RN.Pressable);
export const ScrollView = makeCaptureComponent("ScrollView", RN.ScrollView);
export const SafeAreaView = makeCaptureComponent("SafeAreaView", RN.SafeAreaView);
export const Image = makeCaptureComponent("Image", RN.Image);
export const ImageBackground = makeCaptureComponent("ImageBackground", RN.ImageBackground);
export const TouchableOpacity = makeCaptureComponent("TouchableOpacity", RN.TouchableOpacity);
export const TouchableHighlight = makeCaptureComponent("TouchableHighlight", RN.TouchableHighlight);
export const Switch = makeCaptureComponent("Switch", RN.Switch);
export const TextInput = makeCaptureComponent("TextInput", RN.TextInput);
export const ActivityIndicator = makeCaptureComponent("ActivityIndicator", RN.ActivityIndicator);
export const FlatList = makeCaptureComponent("FlatList", RN.FlatList);
export const SectionList = makeCaptureComponent("SectionList", RN.SectionList);
