module.exports = function (api) {
  const enabled = process.env.RN2FIGMA_CAPTURE === "1";
  api.cache.using(() => enabled);
  const pluginPath = process.env.RN2FIGMA_BABEL_PLUGIN;
  if (enabled && !pluginPath) {
    throw new Error("RN2FIGMA_BABEL_PLUGIN is required in capture mode");
  }
  return {
    presets: ["babel-preset-expo"],
    plugins: enabled
      ? [[require(pluginPath), {
          projectRoot: __dirname,
          runtimeModule: "@/design-capture/react-native",
          gradientModule: "@/design-capture/expo-linear-gradient",
        }]]
      : [],
  };
};
