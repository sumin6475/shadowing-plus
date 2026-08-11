import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const readJson = (name) => JSON.parse(readFileSync(resolve(root, name), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const app = readJson("app.json").expo;
const eas = readJson("eas.json");
const iconPath = "./assets/images/saylo-icon-v2.png";

assert(app.icon === iconPath, `expo.icon must use ${iconPath}`);
assert(app.ios?.icon === iconPath, `expo.ios.icon must use ${iconPath}`);

for (const profile of ["development", "preview", "production"]) {
  assert(
    eas.build?.[profile]?.env?.EXPO_PUBLIC_USE_RN_FETCH === "1",
    `${profile} must set EXPO_PUBLIC_USE_RN_FETCH=1`,
  );
}

const png = readFileSync(resolve(root, iconPath));
assert(png.subarray(1, 4).toString("ascii") === "PNG", "Saylo icon must be a PNG");
assert(png.readUInt32BE(16) === 1024 && png.readUInt32BE(20) === 1024, "Saylo icon must be 1024×1024");
assert(png[25] === 2, "Saylo icon must be opaque RGB with no alpha channel");

console.log("PASS: release transport and iOS icon configuration");
