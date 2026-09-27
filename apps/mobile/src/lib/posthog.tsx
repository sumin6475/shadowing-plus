// PostHog product analytics. Autocapture + identify only.
// Never send transcripts, audio, or phrase text in event properties.
import { useEffect, type ReactNode } from "react";
import { usePathname } from "expo-router";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { useAuth } from "./auth";

const projectToken =
  process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ||
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim();
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim();

export function posthogEnabled(): boolean {
  return Boolean(projectToken && host);
}

function warnIfPostHogIsUnconfigured() {
  if (!__DEV__ || posthogEnabled()) return;
  const missingVariable = projectToken
    ? "EXPO_PUBLIC_POSTHOG_HOST"
    : "EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN (or EXPO_PUBLIC_POSTHOG_API_KEY)";
  console.warn(
    `[PostHog] ${missingVariable} is missing. Analytics is off until it is set.`,
  );
}

export function PostHogGate({ children }: { children: ReactNode }) {
  warnIfPostHogIsUnconfigured();
  if (!posthogEnabled()) return children;
  return (
    <PostHogProvider
      apiKey={projectToken!}
      options={{
        host: host!,
        captureAppLifecycleEvents: true,
        errorTracking: {
          autocapture: { uncaughtExceptions: true, unhandledRejections: true },
        },
      }}
    >
      {children}
    </PostHogProvider>
  );
}

export function PostHogAuthBridge() {
  if (!posthogEnabled()) return null;
  return <PostHogAuthBridgeInner />;
}

function PostHogAuthBridgeInner() {
  const posthog = usePostHog();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!posthog) return;
    if (userId) {
      // Opaque account id is enough to connect sessions. Do not duplicate the
      // learner's email into the analytics processor.
      posthog.identify(userId);
      return;
    }
    posthog.reset();
  }, [posthog, userId]);

  return null;
}

export function PostHogScreenTracker() {
  if (!posthogEnabled()) return null;
  return <PostHogScreenTrackerInner />;
}

function PostHogScreenTrackerInner() {
  const posthog = usePostHog();
  const pathname = usePathname();

  useEffect(() => {
    if (!posthog || !pathname) return;
    posthog.screen(pathname);
  }, [posthog, pathname]);

  return null;
}
