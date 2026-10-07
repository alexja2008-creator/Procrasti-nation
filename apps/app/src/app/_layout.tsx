import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces/500Medium_Italic';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { InstrumentSans_400Regular } from '@expo-google-fonts/instrument-sans/400Regular';
import { InstrumentSans_500Medium } from '@expo-google-fonts/instrument-sans/500Medium';
import { InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans/600SemiBold';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { fonts } from '@pn/core';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/auth-provider';
import { SignedInProviders } from '@/data/signed-in-providers';
import { useUserSettings } from '@/data/user-settings';
import { useTokens } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    [fonts.display]: Fraunces_500Medium,
    [fonts.displayItalic]: Fraunces_500Medium_Italic,
    [fonts.body]: InstrumentSans_400Regular,
    [fonts.bodyMedium]: InstrumentSans_500Medium,
    [fonts.bodySemibold]: InstrumentSans_600SemiBold,
    [fonts.mono]: IBMPlexMono_400Regular,
    [fonts.monoMedium]: IBMPlexMono_500Medium,
    [fonts.logo]: SpaceGrotesk_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator fontsReady={loaded || !!error} />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Keeps the splash up until fonts and the stored session are ready, so signed-in people never see sign-in flash by. */
function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const t = useTokens();
  const { session, loading } = useAuth();
  const ready = fontsReady && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const night = t.scheme === 'night';
  const base = night ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: t.c.bg,
      card: t.c.tabBar.bg,
      text: t.c.ink,
      border: t.c.rule,
      primary: t.c.primary,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={night ? 'light' : 'dark'} />
      {session ? (
        <SignedInProviders userId={session.user.id}>
          <AppStack signedIn />
        </SignedInProviders>
      ) : (
        <AppStack signedIn={false} />
      )}
    </ThemeProvider>
  );
}

/**
 * The screens each state allows. Signed in, the Citizenship Application comes
 * first until it's done or skipped (an error loading settings never traps
 * anyone in it); signed out, only sign-in.
 */
function AppStack({ signedIn }: { signedIn: boolean }) {
  const { settings, status } = useUserSettings();
  const applying = signedIn && status === 'ready' && !settings?.onboardingCompletedAt;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn && !applying}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="territory/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="note/[id]" options={{ presentation: 'modal' }} />
        {/* On web it draws its own panel over the page at laptop width (a full page on phones). */}
        <Stack.Screen name="search" options={{ presentation: Platform.OS === 'web' ? 'transparentModal' : 'modal' }} />
        {/* Full screen, no swipe-to-dismiss: leaving goes through the close button, which ends the session. */}
        <Stack.Screen name="start/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={applying}>
        <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      {/* Signed in, Application or not: the Oath plans a task, and a reset link chooses a new password. */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="plan/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="auth/new-password" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      {/* Open in both states: it's where magic links and OAuth land. */}
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}
