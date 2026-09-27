// expo-notifications always adds aps-environment (remote push). v1 reminders
// are local-only. Run the rest of the entitlements chain first, then strip it
// so the existing App Store profile still signs.
const { withBaseMod } = require("@expo/config-plugins");

module.exports = function withLocalRemindersOnly(config) {
  return withBaseMod(config, {
    platform: "ios",
    mod: "entitlements",
    skipEmptyMod: false,
    async action({ modRequest: { nextMod, ...modRequest }, ...cfg }) {
      const result = await nextMod({ ...cfg, modRequest });
      if (result?.modResults) delete result.modResults["aps-environment"];
      return result;
    },
  });
};
