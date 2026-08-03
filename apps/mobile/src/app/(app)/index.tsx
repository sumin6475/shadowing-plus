import { ThemeProvider } from "@/design/theme";
import { AppShell } from "@/shell";

/**
 * The Shadowing Plus app. Renders the full designed shell (Today / Phrases /
 * Speak / Topics / Library + onboarding and detail flows) ported from the
 * Claude Design prototype. All content is mock sample data for now; screens
 * will be wired to Supabase + the web API in a later phase.
 */
export default function AppHome() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
