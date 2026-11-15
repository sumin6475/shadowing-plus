import { Linking } from "react-native";

// Myne's own site (apps/myne-site, Vercel project `myne`), not the web app.
export const PRIVACY_POLICY_URL = "https://getmyne.vercel.app/privacy";
export const TERMS_OF_SERVICE_URL = "https://getmyne.vercel.app/terms";

export async function openLegalUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}

/**
 * The one place the app names its AI provider. App Review asks every consent
 * point to say who receives the data before it is sent (5.1.2(i); rejections
 * read "identify who the data is sent to"), and a provider named only in the
 * privacy policy has been rejected. So each consent surface (first-run screen,
 * in-page sheet, Settings → Privacy) shows this small line under the switch,
 * and the rest of the UI just says "AI". Full detail lives in the policy.
 */
export const AI_PROVIDER_NOTE = "Our AI provider is OpenAI. It doesn’t train on this by default.";
