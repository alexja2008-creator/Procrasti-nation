import type { ReactNode } from 'react';

import { CaptureProvider } from '@/components/capture';
import { ListsProvider } from '@/data/lists-store';
import { NotesProvider } from '@/data/notes-store';
import { TasksProvider } from '@/data/tasks-store';
import { UserSettingsProvider } from '@/data/user-settings';
import { RemindersProvider } from '@/notifications/reminders-provider';

/** Per-person data for every signed-in screen (tabs, Plan it, …). */
export function SignedInProviders({ userId, children }: { userId: string; children: ReactNode }) {
  return (
    <UserSettingsProvider userId={userId}>
      <TasksProvider userId={userId}>
        <ListsProvider userId={userId}>
          <NotesProvider userId={userId}>
            <CaptureProvider>
              <RemindersProvider userId={userId}>{children}</RemindersProvider>
            </CaptureProvider>
          </NotesProvider>
        </ListsProvider>
      </TasksProvider>
    </UserSettingsProvider>
  );
}
