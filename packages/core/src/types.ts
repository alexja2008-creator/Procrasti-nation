// v2 data model, mirroring supabase/v2/01_schema.sql (camelCase here,
// snake_case in SQL). Timestamps are ISO strings (TIMESTAMPTZ); `*On`
// fields are local YYYY-MM-DD calendar dates. Rows are soft-deleted
// (`deletedAt`) so offline sync can propagate deletions.

export type ISODateTime = string;
/** Local calendar date, YYYY-MM-DD. */
export type LocalDate = string;

export type Persona = 'school' | 'work' | 'both' | 'life';
export type Hours = 'early' | 'day' | 'night';
export type ProcrastinationStyle = 'avoid' | 'perfectionist' | 'overwhelmed' | 'bored';
export type NudgeToneId = 'diplomat' | 'drill' | 'roast';

/** `profiles.preferences`: every Citizenship Application answer, editable in Settings. */
export interface Preferences {
  persona: Persona;
  hours: Hours;
  style: ProcrastinationStyle;
  nudgeTone: NudgeToneId;
  /** Start Mode default timer, derived from `style` unless the user overrides it. */
  startMinutes: 2 | 5 | 10 | 25;
  channels: { push: boolean; email: boolean };
}

/**
 * `user_settings`: private, owner-only. Kept off `profiles`, which is
 * publicly readable (and only exists for users who picked a username).
 */
export interface UserSettings {
  userId: string;
  /** Assigned by the database in signup order; never changes. */
  citizenNumber: number;
  timezone: string | null;
  /** Hour (0–6) at which the user's day rolls over. */
  dayRolloverHour: number;
  /** Empty until the Citizenship Application is finished. */
  preferences: Partial<Preferences>;
  onboardingCompletedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type ListKind = 'school' | 'work' | 'home' | 'custom';

/** A Territory. Tasks with no list sit in Customs. */
export interface List {
  id: string;
  userId: string;
  name: string;
  kind: ListKind;
  /** Stamp ink for this territory's stamps. */
  ink: 'terracotta' | 'violet' | 'forest';
  sortOrder: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
}

/**
 * Where a task came from. 'self' (typed by the person) and 'assignment' (sent
 * by a teacher; the teacher RLS policy reads it) predate v2.
 */
export type TaskSource = 'self' | 'assignment' | 'ai' | 'syllabus' | 'lms' | 'reminders';

/** A task, subtask or AI plan step (steps are child rows via `parentId`). */
export interface Task {
  id: string;
  userId: string;
  listId: string | null;
  parentId: string | null;
  title: string;
  notes: string | null;
  /** `status` is v1's column, kept: 'completed' iff `completedAt` is set. */
  status: 'in_progress' | 'completed';
  dueOn: LocalDate | null;
  /** Set when the task is due at a specific time. */
  dueAt: ISODateTime | null;
  remindAt: ISODateTime | null;
  rrule: string | null;
  estimateMinutes: number | null;
  scheduledOn: LocalDate | null;
  sortOrder: number;
  source: TaskSource;
  externalId: string | null;
  completedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
}

export interface Stamp {
  id: string;
  userId: string;
  taskId: string | null;
  listId: string | null;
  /** e.g. 'first-start', 'residency-7', 'task-done'. */
  kind: string;
  earnedAt: ISODateTime;
}

/** Capture-first note, optionally attached to a task or a territory. */
export interface Note {
  id: string;
  userId: string;
  listId: string | null;
  taskId: string | null;
  body: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
}

export interface StartSession {
  id: string;
  userId: string;
  /** Null once the task is deleted; the start still counts. */
  taskId: string | null;
  startedAt: ISODateTime;
  endedAt: ISODateTime | null;
  plannedMinutes: number;
  outcome: 'done' | 'kept-going' | 'stopped' | 'stuck' | null;
}
