import type { ReactNode } from 'react';

import { CaptureProvider } from '@/components/capture';
import { TasksProvider } from '@/data/tasks-store';
import { UserSettingsProvider } from '@/data/user-settings';

/** Per-person data for every signed-in screen (tabs, Plan it, …). */
export function SignedInProviders({ userId, children }: { userId: string; children: ReactNode }) {
  return (
    <UserSettingsProvider userId={userId}>
      <TasksProvider userId={userId}>
        <CaptureProvider>{children}</CaptureProvider>
      </TasksProvider>
    </UserSettingsProvider>
  );
}
