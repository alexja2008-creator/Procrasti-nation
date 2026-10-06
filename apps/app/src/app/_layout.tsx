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
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/auth-provider';
import { SignedInProviders } from '@/data/signed-in-providers';
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
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator fontsReady={loaded || !!error} />
      </AuthProvider>
    </SafeAreaProvider>
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

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plan/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
        {/* Full screen, no swipe-to-dismiss: leaving goes through the close button, which ends the session. */}
        <Stack.Screen name="start/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      {/* Open in both states: it's where magic links and OAuth land. */}
      <Stack.Screen name="auth/callback" />
    </Stack>
  );

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={night ? 'light' : 'dark'} />
      {session ? <SignedInProviders userId={session.user.id}>{stack}</SignedInProviders> : stack}
    </ThemeProvider>
  );
}
