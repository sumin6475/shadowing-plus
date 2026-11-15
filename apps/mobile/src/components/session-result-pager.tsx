import { type ReactNode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, View } from "react-native";
import { useTheme } from "@/design/theme";
export function SessionResultPager(
  { first, second, onPageChange }: {
    first: ReactNode;
    second: ReactNode;
    onPageChange?: (page: number) => void;
  },
) {
  const t = useTheme(),
    pager = useRef<ScrollView>(null),
    [size, setSize] = useState({ width: 0, height: 0 }),
    [page, setPage] = useState(0);
  const width = size.width, pageHeight = Math.max(0, size.height - 26);
  const pageRef = useRef(0);
  useEffect(() => {
    if (width) {
      pager.current?.scrollTo({ x: pageRef.current * width, animated: false });
    }
  }, [width]);
  const select = (index: number) => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) =>
      pager.current?.scrollTo({ x: index * width, animated: !reduce })
    );
  };
  const selected = (index: number) => {
    if (index === pageRef.current) return;
    pageRef.current = index;
    setPage(index);
    onPageChange?.(index);
  };
  return (
    <View
      style={{ flex: 1 }}
      onLayout={(e) =>
        setSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })}
    >
      {width > 0 && pageHeight > 0
        ? (
          <ScrollView
            ref={pager}
            horizontal
            contentContainerStyle={{ height: pageHeight }}
            pagingEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            onMomentumScrollEnd={(e) =>
              width &&
              selected(
                Math.max(
                  0,
                  Math.min(
                    1,
                    Math.round(e.nativeEvent.contentOffset.x / width),
                  ),
                ),
              )}
          >
            {[first, second].map((content, index) => (
              <View
                key={index}
                accessibilityElementsHidden={page !== index}
                importantForAccessibility={page === index
                  ? "auto"
                  : "no-hide-descendants"}
                style={{ width, height: pageHeight }}
              >
                {content}
              </View>
            ))}
          </ScrollView>
        )
        : <View style={{ flex: 1 }} />}
      <View
        style={{ flexDirection: "row", justifyContent: "center", height: 26 }}
      >
        {["Session", "Feedback"].map((name, index) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={`${name}, page ${index + 1} of 2`}
            accessibilityState={{ selected: page === index }}
            onPress={() => {
              selected(index);
              select(index);
            }}
            hitSlop={{ top: 8, bottom: 8 }}
            style={{
              width: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: page === index ? t.colors.acc : t.colors.ink3,
                opacity: page === index ? 1 : 0.45,
              }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
