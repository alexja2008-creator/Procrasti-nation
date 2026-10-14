// The site's own pages (the privacy policy and terms), opened from the app: the in-app browser on
// iPhone, a new tab on the web. The site is the API's host (apps/site serves both).
import * as WebBrowser from 'expo-web-browser';

const SITE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://procrasti-nation.work';

export function openSitePage(path: '/privacy' | '/terms'): void {
  WebBrowser.openBrowserAsync(`${SITE_URL}${path}`).catch(() => undefined);
}
