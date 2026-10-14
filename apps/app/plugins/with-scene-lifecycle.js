// iOS 27 stops apps at launch unless they use the scene life cycle, and SDK
// 57's generated project still starts React Native from the app delegate.
// Expo ships the scene delegate (ExpoAppSceneDelegate); this wires it in on
// every `expo prebuild`: the Info.plist names it, and the app delegate keeps
// creating the React Native factory but leaves the window to the scene.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const START_IN_APP_DELEGATE =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    };
    return c;
  });

  return withAppDelegate(config, (c) => {
    let src = c.modResults.contents;
    if (src.includes('ExpoReactNativeFactoryProvider')) return c; // already done
    if (!/class AppDelegate: ExpoAppDelegate \{/.test(src) || !START_IN_APP_DELEGATE.test(src)) {
      throw new Error('with-scene-lifecycle: AppDelegate.swift is not the shape it expects; update the plugin for this SDK.');
    }
    src = src
      .replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
      .replace(START_IN_APP_DELEGATE, '\n    // The scene delegate (ExpoAppSceneDelegate) creates the window and starts React Native into it.\n');
    c.modResults.contents = src;
    return c;
  });
};
