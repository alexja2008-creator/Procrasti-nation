#!/bin/sh
# iOS development build on the Simulator, for what Expo Go can't do (local
# notifications on iOS 27, the reminder buttons' Swift add-on, Sign in with
# Apple later). `npx expo run:ios` can't build inside this repo while it lives
# on the iCloud-synced Desktop: iCloud tags new files with attributes that code
# signing rejects. So this builds a copy outside iCloud and installs it on the
# booted Simulator; the app still loads its JavaScript from Metro in this repo.
#
#   sh apps/app/scripts/ios-dev-build.sh                   # Metro on 8081
#   METRO_PORT=8083 sh apps/app/scripts/ios-dev-build.sh   # another Metro
#
# Until the Apple Developer account exists, the build leaves out the Sign in
# with Apple entitlement (it needs a signing team even on the Simulator) and
# isn't code signed.
set -eu

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${BUILD_DIR:-$HOME/Library/Caches/procrastination-ios}"
METRO_PORT="${METRO_PORT:-8081}"
export LANG=en_US.UTF-8

mkdir -p "$BUILD_DIR"
rsync -a --delete --exclude /ios --exclude /.expo --exclude /dist "$APP_DIR/" "$BUILD_DIR/app/"
cd "$BUILD_DIR/app"
npx expo prebuild --platform ios --no-install < /dev/null
/usr/libexec/PlistBuddy -c "Delete :com.apple.developer.applesignin" ios/ProcrastiNation/ProcrastiNation.entitlements 2>/dev/null || true
(cd ios && pod install)
xcodebuild -workspace ios/ProcrastiNation.xcworkspace -scheme ProcrastiNation -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath "$BUILD_DIR/build" \
  RCT_METRO_PORT="$METRO_PORT" CODE_SIGNING_ALLOWED=NO build
BUNDLE_ID="$(npx expo config --type public --json 2>/dev/null | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).ios.bundleIdentifier')"
xcrun simctl install booted "$BUILD_DIR/build/Build/Products/Debug-iphonesimulator/ProcrastiNation.app"
xcrun simctl launch booted "$BUNDLE_ID"
