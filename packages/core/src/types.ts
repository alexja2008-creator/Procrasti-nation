// Draft v2 data model, mirroring the planned Supabase schema (Phase 2
// migration). Timestamps are ISO strings (TIMESTAMPTZ); calendar dates are
// local YYYY-MM-DD strings. Rows are soft-deleted (`deleted_at`) for sync.

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

export interface Profile {
  id: string;
  displayName: string | null;
  citizenNumber: number;
  timezone: string | null;
  /** Hour (0–6) at which the user's day rolls over. */
  dayRolloverHour: number;
  preferences: Preferences | null;
  onboardingCompletedAt: ISODateTime | null;
  entitlement: 'free' | 'trial' | 'pro';
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

export type TaskSource = 'manual' | 'ai' | 'syllabus' | 'lms' | 'reminders';

/** A task, subtask or AI plan step (steps are child rows via `parentId`). */
export interface Task {
  id: string;
  userId: string;
  listId: string | null;
  parentId: string | null;
  title: string;
  notes: string | null;
  dueDate: LocalDate | null;
  /** Set when the task is due at a specific time. */
  dueAt: ISODateTime | null;
  remindAt: ISODateTime | null;
  rrule: string | null;
  estimateMinutes: number | null;
  scheduledDate: LocalDate | null;
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

export interface StartSession {
  id: string;
  userId: string;
  taskId: string;
  startedAt: ISODateTime;
  endedAt: ISODateTime | null;
  plannedMinutes: number;
  outcome: 'done' | 'kept-going' | 'stopped' | 'stuck' | null;
}
