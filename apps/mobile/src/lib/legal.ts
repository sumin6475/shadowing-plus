import { Linking } from "react-native";

// Myne's own site (apps/myne-site, Vercel project `myne`), not the web app.
export const PRIVACY_POLICY_URL = "https://getmyne.vercel.app/privacy";
export const TERMS_OF_SERVICE_URL = "https://getmyne.vercel.app/terms";

export async function openLegalUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}
