// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The app imports ../../packages/core through the @pn/core tsconfig alias.
// The repo is not an npm workspace (the site is on React 18, this app on 19),
// so Metro has to be told to watch that folder explicitly.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../../packages')];

module.exports = config;
