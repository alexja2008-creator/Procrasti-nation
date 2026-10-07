// Development builds (`npx expo run:ios`) need an iOS bundle identifier, and
// the App Store one isn't chosen yet (it's hard to change later; see
// PN2-HANDOFF.md, open items). Until it is, local Simulator builds use this
// placeholder; set PN_IOS_BUNDLE_ID to override it. Replace both with the real
// identifier in app.json once it's decided.
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    bundleIdentifier: config.ios?.bundleIdentifier ?? process.env.PN_IOS_BUNDLE_ID ?? 'dev.procrastination.local',
  },
});
