import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCapture } from '@/components/capture';
import { Icon, type IconName } from '@/components/icon';
import { Logo } from '@/components/logo';
import { Text } from '@/components/text';
import { useStyles, type Tokens } from '@/theme/tokens';

/**
 * Main navigation. Phones get the A2 bottom bar (Today · Upcoming · + ·
 * Territories · Passport); laptop-width web gets the same items as a sidebar.
 * Children are the TabTriggers, with <CaptureButton> placed where it belongs.
 */
export function NavBar({ wide, style, children, ...props }: TabListProps & { wide: boolean }) {
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  if (wide) {
    return (
      <View {...props} style={[s.sidebar, { paddingTop: insets.top + 28 }]}>
        <View style={s.sidebarLogo}>
          <Logo />
        </View>
        {children}
      </View>
    );
  }
  return (
    <View {...props} style={[s.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {children}
    </View>
  );
}

type NavItemProps = TabTriggerSlotProps & { icon: IconName; label: string; wide: boolean };

export function NavItem({ icon, label, wide, isFocused, ...props }: NavItemProps) {
  const s = useStyles(makeStyles);
  const t = s.t;
  const color = isFocused ? t.c.primary : t.c.muted;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [wide ? s.sideItem : s.tabItem, wide && isFocused && s.sideItemActive, pressed && s.pressed]}>
      <Icon name={icon} color={color} strokeWidth={isFocused ? 1.8 : 1.7} />
      <Text
        variant={wide ? 'body' : 'tab'}
        color={wide && isFocused ? t.c.primaryText : color}
        style={{ fontFamily: isFocused ? t.fonts.bodySemibold : t.fonts.bodyMedium }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The always-present capture button: opens quick add. */
export function CaptureButton({ wide }: { wide: boolean }) {
  const { open } = useCapture();
  const s = useStyles(makeStyles);
  const t = s.t;
  if (wide) {
    return (
      <Pressable
        onPress={() => open()}
        accessibilityRole="button"
        style={({ pressed }) => [s.sideCapture, pressed && s.pressed]}>
        <Icon name="plus" color={t.c.onPrimary} size={18} strokeWidth={2} />
        <Text variant="button" color={t.c.onPrimary}>
          Capture
        </Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => open()}
      accessibilityRole="button"
      accessibilityLabel="Capture something new"
      style={({ pressed }) => [s.capture, pressed && s.pressed]}>
      <Icon name="plus" color={t.c.onPrimary} size={24} strokeWidth={2} />
    </Pressable>
  );
}

const makeStyles = (t: Tokens) => ({
  t,
  ...StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      paddingHorizontal: 14,
      backgroundColor: t.c.tabBar.bg,
      borderTopWidth: 1,
      borderTopColor: t.c.tabBar.border,
    },
    tabItem: {
      width: 62,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    capture: {
      width: 66,
      height: 66,
      marginTop: -28,
      borderRadius: 33,
      borderWidth: 5,
      borderColor: t.c.tabBar.bg,
      backgroundColor: t.c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sidebar: {
      width: 236,
      gap: 4,
      paddingHorizontal: 16,
      backgroundColor: t.c.tabBar.bg,
      borderRightWidth: 1,
      borderRightColor: t.c.tabBar.border,
    },
    sidebarLogo: { paddingHorizontal: 8, marginBottom: 24 },
    sideItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: t.hitTarget,
      paddingHorizontal: 12,
      borderRadius: t.radii.md,
    },
    sideItemActive: { backgroundColor: t.c.bg },
    sideCapture: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: t.hitTarget,
      marginBottom: 16,
      borderRadius: t.radii.pill,
      backgroundColor: t.c.primary,
    },
    pressed: { opacity: 0.7 },
  }),
});
