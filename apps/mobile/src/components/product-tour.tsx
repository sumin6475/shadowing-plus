// product-tour.tsx — the dim-and-spotlight coach marks shown once, on Today,
// right after a learner's first sign-in.
//
// How the spotlight works: the overlay is a transparent <Modal>, which iOS
// presents above EVERYTHING including the native UITabBar — so a cutout in the
// dim layer reveals the real control underneath rather than a screenshot of it.
// The dim + hole is one SVG rect masked by a second, rounded rect.
//
// Two kinds of target:
//   • measured — a <TourTarget> wrapper reports its window rect. Used for
//     anything inside the scroll view. If it sits off-screen the tour scrolls
//     it into view first; if it still can't be shown, that step is skipped.
//   • unmasked — expo-router's NativeTabs bar is a real UITabBar that draws
//     ABOVE a presented modal (verified on the iOS 26 simulator: the bar stays
//     at full brightness while the rest of the screen dims). So the tab-bar
//     step cuts no hole at all — the platform already spotlights the bar for
//     us — and instead drops a caret directly above ONE tab, so the step names
//     a specific destination instead of waving at the whole strip.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Mask, Rect } from "react-native-svg";

import { useTheme } from "@/design/theme";
import { Icon, Serif } from "@/design/ui";
import {
  hasSeenProductTour,
  markProductTourSeen,
  productTourCopy,
  TOUR_STEPS,
  type TourStepId,
} from "@/lib/product-tour";

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Registration {
  measure: () => Promise<TargetRect | null>;
  radius: number;
}

interface TourRegistry {
  register: (id: TourStepId, entry: Registration) => () => void;
}

const RegistryContext = createContext<TourRegistry | null>(null);

/** Padding around the highlighted control, so the hole reads as a spotlight. */
const HOLE_PAD = 8;
/** Dim over everything the step is not pointing at. */
const SCRIM = "rgba(6,10,24,0.74)";
// Where the tab bar starts, and why it is `insets.bottom` alone:
// inside a tab navigator, react-native-safe-area-context already folds the tab
// bar into the bottom inset — printed live on the iOS 26 simulator it is 83pt
// (49 bar + 34 home indicator) against an 874pt window, so `height -
// insets.bottom` ≈ 791 lands on the bar's top edge. Subtracting a separate bar
// height on top of that (the first two attempts) put the caret ~60pt too high.
// The modal container measures the FULL window height, so window-space y from
// `measureInWindow` can be used directly for `top`.
/** Clearance between the caret and the top of the tab bar. */
const POINTER_GAP = 10;
/** Clearance between the coach card and whatever it points at. */
const CARD_GAP = 14;
/** A measured target must leave this much room on one side for the card. */
const CARD_MIN_HEIGHT = 130;
/** …and show at least this much of itself, or the hole reads as noise. */
const MIN_VISIBLE = 72;
/** Roughly a full coach card (title + 3 lines + actions), for side choice. */
const CARD_FULL_HEIGHT = 190;
/** Diameter of the caret bubble that aims at a tab. */
const POINTER_SIZE = 34;

/**
 * Horizontal centre of one labelled tab, in window points.
 *
 * The bar can't be measured from JS, and it can't be drawn over either — this
 * only aims a caret that sits ABOVE it, so a few points of error is invisible.
 * Model, checked against the iOS 26 simulator at 402pt wide: the labelled
 * triggers share one capsule inset 12pt from the leading edge, and the
 * search-role Talk circle floats at the trailing edge outside it.
 */
function tabCenterX(width: number, index: number, count = 3): number {
  const circleDiameter = 64;
  const left = 12;
  const right = width - 12 - circleDiameter - 8;
  const slot = (right - left) / count;
  return left + slot * (index + 0.5);
}

/** Index of the tab the `tabs` step points at (Today · Phrases · Studio). */
const POINTED_TAB_INDEX = 1;

/**
 * Wraps a control so the tour can spotlight it. Renders a plain View — no
 * layout of its own beyond what the caller passes in `style`.
 */
export function TourTarget({
  id,
  radius = 20,
  style,
  children,
}: {
  id: TourStepId;
  radius?: number;
  style?: View["props"]["style"];
  children: ReactNode;
}) {
  const registry = useContext(RegistryContext);
  const ref = useRef<View | null>(null);

  useEffect(() => {
    if (!registry) return;
    return registry.register(id, {
      radius,
      measure: () =>
        new Promise<TargetRect | null>((resolve) => {
          const node = ref.current;
          if (!node) {
            resolve(null);
            return;
          }
          node.measureInWindow((x, y, width, height) => {
            resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
          });
        }),
    });
  }, [id, radius, registry]);

  // collapsable={false} keeps the view in the native hierarchy so it stays
  // measurable even when it adds no visual of its own.
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface ResolvedStep {
  id: TourStepId;
  /** null = dim the screen with no cutout (the tab-bar step). */
  rect: TargetRect | null;
  radius: number;
  /** Window-x of a caret drawn just above the native tab bar, when set. */
  pointerX?: number;
}

/**
 * Mounts the coach marks around a screen's content.
 *
 * `enabled` should only go true once the screen has real data on it — dimming
 * a skeleton teaches nothing. Pass the host ScrollView's ref and a ref holding
 * its current offset so off-screen targets can be scrolled into view.
 */
export function ProductTourProvider({
  enabled,
  scrollRef,
  scrollOffsetRef,
  children,
}: {
  enabled: boolean;
  scrollRef?: RefObject<ScrollView | null>;
  scrollOffsetRef?: RefObject<number>;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const registrations = useRef(new Map<TourStepId, Registration>());
  const [step, setStep] = useState<ResolvedStep | null>(null);
  const [index, setIndex] = useState(0);
  const runningRef = useRef(false);
  const finishedRef = useRef(false);

  const register = useCallback((id: TourStepId, entry: Registration) => {
    registrations.current.set(id, entry);
    return () => {
      if (registrations.current.get(id) === entry) registrations.current.delete(id);
    };
  }, []);

  const registry = useMemo<TourRegistry>(() => ({ register }), [register]);

  /** Measure one step, scrolling it into view when it lands off-screen.
   *  Returns null only when the step has no registered target at all. */
  const resolveStep = useCallback(
    async (id: TourStepId): Promise<ResolvedStep | null> => {
      // The native bar is never dimmed, so it needs no cutout — see the note
      // at the top of this file. The caret is what makes the step specific.
      if (id === "tabs") {
        return {
          id,
          rect: null,
          radius: 0,
          pointerX: tabCenterX(Dimensions.get("window").width, POINTED_TAB_INDEX),
        };
      }

      const entry = registrations.current.get(id);
      if (!entry) return null;

      const { height } = Dimensions.get("window");
      // The Today header sits right at the inset, so anything stricter than
      // insets.top would silently skip the profile avatar.
      const top = insets.top;
      // Everything below this is the tab bar, which draws over us.
      const safeBottom = height - insets.bottom - CARD_GAP;

      let rect = await entry.measure();
      if (!rect) return null;

      // A tall card (the Today queue) is the LAST thing in the scroll view, so
      // it can never be framed whole above the tab bar. Requiring that would
      // silently drop the most useful step. Enough of it on screen to read as
      // "this thing", plus room for the coach card on one side, is the bar.
      const fits = () => {
        const visible = Math.min(rect!.y + rect!.height, safeBottom) - Math.max(rect!.y, top);
        const roomAbove = rect!.y - top;
        const roomBelow = safeBottom - (rect!.y + rect!.height);
        // Relative to the target's own height: a 44pt avatar is fully visible
        // at 44, a 250pt card only needs its top third to read as "this thing".
        return (
          visible >= Math.min(rect!.height, MIN_VISIBLE) &&
          Math.max(roomAbove, roomBelow) >= CARD_MIN_HEIGHT
        );
      };

      if (!fits() && scrollRef?.current && scrollOffsetRef) {
        // scrollTo clamps to the content, so an unreachable target simply ends
        // up as high as it can go and is re-judged on its merits.
        const next = Math.max(0, scrollOffsetRef.current + (rect.y - (top + 24)));
        scrollRef.current.scrollTo({ y: next, animated: true });
        await wait(420);
        rect = await entry.measure();
        if (!rect) return null;
      }

      // A registered step is never dropped: if the control still can't be
      // framed (a short screen, a tall card pinned at the end of the scroll),
      // show the same copy with no cutout rather than teaching nothing.
      return fits() ? { id, rect, radius: entry.radius } : { id, rect: null, radius: 0 };
    },
    [insets.bottom, insets.top, scrollOffsetRef, scrollRef],
  );

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setStep(null);
    void markProductTourSeen();
  }, []);

  /** Walk forward from `from` until a step resolves; finish if none do. */
  const advance = useCallback(
    async (from: number) => {
      for (let i = from; i < TOUR_STEPS.length; i += 1) {
        const resolved = await resolveStep(TOUR_STEPS[i]);
        if (resolved) {
          setIndex(i);
          setStep(resolved);
          return;
        }
      }
      finish();
    },
    [finish, resolveStep],
  );

  useEffect(() => {
    if (!enabled || runningRef.current || finishedRef.current) return;
    let active = true;
    void (async () => {
      if (await hasSeenProductTour()) {
        finishedRef.current = true;
        return;
      }
      // One frame past "enabled" so the entrance stagger has laid the cards out.
      await wait(500);
      if (!active || finishedRef.current) return;
      runningRef.current = true;
      await advance(0);
    })();
    return () => {
      active = false;
    };
  }, [advance, enabled]);

  const onNext = useCallback(() => {
    if (!step) return;
    const from = TOUR_STEPS.indexOf(step.id) + 1;
    if (from >= TOUR_STEPS.length) {
      finish();
      return;
    }
    void advance(from);
  }, [advance, finish, step]);

  return (
    <RegistryContext.Provider value={registry}>
      {children}
      {step ? <Spotlight step={step} index={index} onNext={onNext} onSkip={finish} /> : null}
    </RegistryContext.Provider>
  );
}

function Spotlight({
  step,
  index,
  onNext,
  onSkip,
}: {
  step: ResolvedStep;
  index: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  // Measured, not assumed — see the note by POINTER_GAP.
  const [containerHeight, setContainerHeight] = useState(0);
  const copy = productTourCopy();
  const stepCopy = copy.steps[step.id];
  const isLast = index === TOUR_STEPS.length - 1;

  const hole = step.rect
    ? {
        x: Math.max(0, step.rect.x - HOLE_PAD),
        y: Math.max(0, step.rect.y - HOLE_PAD),
        width: step.rect.width + HOLE_PAD * 2,
        height: step.rect.height + HOLE_PAD * 2,
      }
    : null;

  /** Top of the native tab bar, in window space — see the note by POINTER_GAP. */
  const barTop = height - insets.bottom;
  /** Window-y of the caret's top edge, when the step has one. */
  const pointerTop = barTop - POINTER_SIZE - POINTER_GAP;
  /** A window-space y, expressed as a `bottom` inside the measured container. */
  const bottomOf = (windowY: number) => containerHeight - windowY;

  // Below the hole only when a whole card fits clear of the tab bar; otherwise
  // above, which is always the roomier side for a low target. With no hole
  // (the tab-bar step) the card sits above the caret, or above the bar itself.
  const roomBelow = hole ? barTop - CARD_GAP - (hole.y + hole.height) : 0;
  const cardStyle = !hole
    ? { top: undefined, bottom: bottomOf((step.pointerX === undefined ? barTop : pointerTop) - CARD_GAP) }
    : roomBelow >= CARD_FULL_HEIGHT
      ? { top: hole.y + hole.height + 16, bottom: undefined }
      : { top: undefined, bottom: bottomOf(hole.y - 16) };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSkip}
      accessibilityViewIsModal
    >
      <View
        style={StyleSheet.absoluteFill}
        accessibilityLabel={copy.a11yLabel}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        {hole ? (
          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <Mask id="spotlight" maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
                <Rect x={0} y={0} width={width} height={height} fill="#fff" />
                <Rect
                  x={hole.x}
                  y={hole.y}
                  width={hole.width}
                  height={hole.height}
                  rx={step.radius}
                  ry={step.radius}
                  fill="#000"
                />
              </Mask>
            </Defs>
            <Rect x={0} y={0} width={width} height={height} fill={SCRIM} mask="url(#spotlight)" />
            <Rect
              x={hole.x}
              y={hole.y}
              width={hole.width}
              height={hole.height}
              rx={step.radius}
              ry={step.radius}
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={1.5}
            />
          </Svg>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: SCRIM }]} pointerEvents="none" />
        )}

        {/* Caret aimed at one tab. The bar underneath is already at full
            brightness because the modal cannot cover it, so this is what turns
            "the bar" into "that tab". */}
        {step.pointerX === undefined ? null : (
          <View
            pointerEvents="none"
            style={[
              styles.pointer,
              {
                left: step.pointerX - POINTER_SIZE / 2,
                top: pointerTop,
                backgroundColor: t.colors.acc,
              },
            ]}
          >
            <View style={{ transform: [{ rotate: "90deg" }] }}>
              <Icon name="chev" s={16} w={2.6} c={t.colors.onAcc} />
            </View>
          </View>
        )}

        {/* Catches taps anywhere off the card, so the tour always advances. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? copy.last : copy.next}
        />

        <View
          style={[
            styles.card,
            { backgroundColor: t.colors.card, borderRadius: t.r },
            t.shadowLg,
            cardStyle,
            // One frame of nothing beats one frame in the wrong place: a
            // bottom-anchored card is meaningless until the container is measured.
            cardStyle.bottom !== undefined && containerHeight === 0 ? { opacity: 0 } : null,
          ]}
        >
          <View style={styles.dots}>
            {TOUR_STEPS.map((id, i) => (
              <View
                key={id}
                style={[
                  styles.dot,
                  { backgroundColor: i === index ? t.colors.acc : t.colors.soft },
                ]}
              />
            ))}
          </View>
          <Serif style={{ fontSize: 23, lineHeight: 29, color: t.colors.ink, marginTop: 10 }}>
            {stepCopy.title}
          </Serif>
          <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 8 }}>
            {stepCopy.body}
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={onSkip} hitSlop={10} accessibilityRole="button">
              <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.ink3 }}>{copy.skip}</Text>
            </Pressable>
            <Pressable
              onPress={onNext}
              accessibilityRole="button"
              style={[styles.next, { backgroundColor: t.colors.acc }]}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.onAcc }}>
                {isLast ? copy.last : copy.next}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    left: 18,
    right: 18,
    padding: 20,
  },
  pointer: {
    position: "absolute",
    width: POINTER_SIZE,
    height: POINTER_SIZE,
    borderRadius: POINTER_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  next: {
    height: 44,
    minWidth: 116,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
});
