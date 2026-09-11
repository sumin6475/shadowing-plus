import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const readJson = (name) => JSON.parse(readFileSync(resolve(root, name), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const app = readJson("app.json").expo;
const eas = readJson("eas.json");
const iconPath = "./assets/images/saylo-icon-v3.png";

assert(app.icon === iconPath, `expo.icon must use ${iconPath}`);
assert(app.ios?.icon === iconPath, `expo.ios.icon must use ${iconPath}`);

for (const profile of ["development", "preview", "production"]) {
  assert(
    eas.build?.[profile]?.env?.EXPO_PUBLIC_USE_RN_FETCH === "1",
    `${profile} must set EXPO_PUBLIC_USE_RN_FETCH=1`,
  );
}

// Privacy manifest (App Store submission gate). Apple rejects an upload whose
// app target has no PrivacyInfo.xcprivacy, and `expo prebuild` only emits one
// when expo.ios.privacyManifests exists. Assert the shape, not just the key.
const privacy = app.ios?.privacyManifests;
assert(privacy, "expo.ios.privacyManifests is required - see docs/release/app-store-submission-audit.md");
assert(privacy.NSPrivacyTracking === false, "NSPrivacyTracking must be false (no ATT, no IDFA, no cross-app tracking)");
assert(
  Array.isArray(privacy.NSPrivacyTrackingDomains) && privacy.NSPrivacyTrackingDomains.length === 0,
  "NSPrivacyTrackingDomains must be empty",
);
assert(privacy.NSPrivacyCollectedDataTypes?.length > 0, "NSPrivacyCollectedDataTypes must list what the app collects");
for (const entry of privacy.NSPrivacyCollectedDataTypes) {
  assert(
    typeof entry.NSPrivacyCollectedDataType === "string" &&
      typeof entry.NSPrivacyCollectedDataTypeLinked === "boolean" &&
      entry.NSPrivacyCollectedDataTypeTracking === false &&
      Array.isArray(entry.NSPrivacyCollectedDataTypePurposes) &&
      entry.NSPrivacyCollectedDataTypePurposes.length > 0,
    `malformed NSPrivacyCollectedDataTypes entry: ${JSON.stringify(entry)}`,
  );
}
// Speaking recordings are local-only. The moment cloud sync ships, this has to
// change AND the App Privacy label needs Audio Data.
assert(
  !privacy.NSPrivacyCollectedDataTypes.some((e) => e.NSPrivacyCollectedDataType === "NSPrivacyCollectedDataTypeAudioData"),
  "AudioData is declared - recordings are supposed to stay on device. Update the privacy policy and label first.",
);
assert(privacy.NSPrivacyAccessedAPITypes?.length > 0, "NSPrivacyAccessedAPITypes must declare required-reason API use");

// Unfinished surfaces (Library, Recommendations) must be absent from the App
// Store build - Guideline 2.1. See src/lib/release-flags.ts.
const buildEnv = (profile) => eas.build?.[profile]?.["env"] ?? {};
assert(
  buildEnv("production").EXPO_PUBLIC_PREVIEW_FEATURES === undefined,
  "production must NOT set EXPO_PUBLIC_PREVIEW_FEATURES - preview-only surfaces would ship",
);
for (const profile of ["development", "preview"]) {
  assert(
    buildEnv(profile).EXPO_PUBLIC_PREVIEW_FEATURES === "1",
    `${profile} must set EXPO_PUBLIC_PREVIEW_FEATURES=1`,
  );
}

const png = readFileSync(resolve(root, iconPath));
assert(png.subarray(1, 4).toString("ascii") === "PNG", "Saylo icon must be a PNG");
assert(png.readUInt32BE(16) === 1024 && png.readUInt32BE(20) === 1024, "Saylo icon must be 1024×1024");
assert(png[25] === 2, "Saylo icon must be opaque RGB with no alpha channel");

console.log("PASS: release transport, iOS icon, privacy manifest, preview-feature gating");
