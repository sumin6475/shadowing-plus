import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/** Hydration is a one-shot fact, not React state: it never changes again, so
 *  nothing ever needs to subscribe. getServerSnapshot answers the SSR and
 *  hydration renders, getSnapshot every render after — which is exactly the old
 *  false-then-true sequence, without a setState in an effect. */
const neverChanges = () => () => {};
const hydrated = () => true;
const notHydrated = () => false;

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(neverChanges, hydrated, notHydrated);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
