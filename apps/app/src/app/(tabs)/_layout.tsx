import { usePathname } from 'expo-router';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet } from 'react-native';

import { CaptureButton, NavBar, NavItem } from '@/components/nav-bar';
import { openSearch } from '@/components/search-button';
import { useIsWide } from '@/hooks/use-is-wide';
import { useShortcuts } from '@/hooks/use-shortcuts';

export default function TabsLayout() {
  const wide = useIsWide();
  // Web: ⌘K (Ctrl+K) or / opens search from anywhere; not a second one while it's open.
  const pathname = usePathname();
  useShortcuts(pathname === '/search' ? {} : { 'Mod+K': openSearch, '/': openSearch });

  const list = (
    <TabList asChild>
      <NavBar wide={wide}>
        {wide && <CaptureButton wide />}
        <TabTrigger name="today" href="/" asChild>
          <NavItem icon="sun" label="Today" wide={wide} />
        </TabTrigger>
        <TabTrigger name="upcoming" href="/upcoming" asChild>
          <NavItem icon="calendar" label="Upcoming" wide={wide} />
        </TabTrigger>
        {!wide && <CaptureButton wide={false} />}
        <TabTrigger name="territories" href="/territories" asChild>
          <NavItem icon="map" label="Territories" wide={wide} />
        </TabTrigger>
        <TabTrigger name="passport" href="/passport" asChild>
          <NavItem icon="passport" label="Passport" wide={wide} />
        </TabTrigger>
      </NavBar>
    </TabList>
  );

  return (
    <Tabs style={wide ? styles.row : styles.column}>
      {wide && list}
      <TabSlot style={styles.slot} />
      {!wide && list}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  column: { flex: 1 },
  slot: { flex: 1 },
});
