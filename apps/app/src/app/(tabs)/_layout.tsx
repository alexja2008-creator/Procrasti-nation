import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { CaptureProvider } from '@/components/capture';
import { CaptureButton, NavBar, NavItem } from '@/components/nav-bar';
import { TasksProvider } from '@/data/tasks-store';
import { UserSettingsProvider } from '@/data/user-settings';
import { useIsWide } from '@/hooks/use-is-wide';

/** The signed-in app: per-person data providers around the tabs. */
export default function TabsLayout() {
  const { session } = useAuth();
  // Briefly null while signing out, before the sign-in gate swaps this screen away.
  if (!session) return null;
  const userId = session.user.id;
  return (
    <UserSettingsProvider userId={userId}>
      <TasksProvider userId={userId}>
        <CaptureProvider>
          <TabsShell />
        </CaptureProvider>
      </TasksProvider>
    </UserSettingsProvider>
  );
}

function TabsShell() {
  const wide = useIsWide();

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
