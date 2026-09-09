import { Linking } from "react-native";

export const PRIVACY_POLICY_URL = "https://shadowing-plus.vercel.app/privacy";
export const TERMS_OF_SERVICE_URL = "https://shadowing-plus.vercel.app/terms";

export async function openLegalUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}
