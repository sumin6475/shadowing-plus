import React, { forwardRef, useContext, useEffect, useId, useMemo, useRef } from "react";
import { LinearGradient as NativeLinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { CaptureActiveContext, CaptureParentContext, removeCaptureNode, sanitizeCaptureValue, upsertCaptureNode, type CaptureSource } from "./registry";

const CaptureNativeLinearGradient = NativeLinearGradient as React.ComponentType<any>;

export const LinearGradient = forwardRef<any, any>(function CapturedLinearGradient(inputProps, forwardedRef) {
  const { __rn2figmaSource, children, style, onLayout, ...props } = inputProps as { __rn2figmaSource?: CaptureSource; [key: string]: any };
  const parentId = useContext(CaptureParentContext);
  const active = useContext(CaptureActiveContext);
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = useMemo(() => `rn-gradient-${reactId}`, [reactId]);
  const nativeRef = useRef<any>(null);
  const measure = async () => new Promise<{ x: number; y: number; width: number; height: number } | null>((resolve) => {
    if (!nativeRef.current?.measureInWindow) return resolve(null);
    nativeRef.current.measureInWindow((x: number, y: number, width: number, height: number) => resolve({ x, y, width, height }));
  });
  const register = () => {
    if (!active) {
      removeCaptureNode(id);
      return;
    }
    upsertCaptureNode({
      id,
      parentId,
      kind: "LinearGradient",
      source: __rn2figmaSource,
      style: sanitizeCaptureValue(StyleSheet.flatten(style) ?? {}) as Record<string, unknown>,
      props: sanitizeCaptureValue({ colors: props.colors, locations: props.locations, start: props.start, end: props.end }) as Record<string, unknown>,
    }, measure);
  };
  useEffect(() => {
    if (active) register();
    else removeCaptureNode(id);
    return () => removeCaptureNode(id);
  });
  return (
    <CaptureParentContext.Provider value={id}>
      <CaptureNativeLinearGradient
        {...props}
        ref={(value: unknown) => {
          nativeRef.current = value;
          if (typeof forwardedRef === "function") forwardedRef(value);
          else if (forwardedRef) forwardedRef.current = value;
        }}
        style={style}
        onLayout={(event: unknown) => {
          register();
          onLayout?.(event);
        }}
      >
        {children}
      </CaptureNativeLinearGradient>
    </CaptureParentContext.Provider>
  );
});
