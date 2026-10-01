// Mock data matching the A2 canvas, until Supabase sync lands (Phase 2/3).

export const mockProfile = {
  firstName: 'Maya',
  lastName: 'Reyes',
  citizenNumber: 42,
  residencyDays: 12,
  starts: 17,
};

export const mockCustomsCount = 3;

export const mockNextStep = {
  id: 'step-wwi-1',
  title: 'Open a new doc named “WWI paper” and paste in the prompt',
  minutes: 3,
  territory: 'History 110',
  due: 'due Fri',
  index: 1,
  total: 8,
  aiBuilt: true,
};

export interface AgendaItem {
  id: string;
  title: string;
  /** Territory and plan position, e.g. "Chem 201 · step 3 of 6". */
  meta?: string;
  rrule?: string;
  minutes?: number;
  time?: string;
  /** Big or vague task with no plan yet: offer "Plan it". */
  suggestPlan?: boolean;
  done?: boolean;
}

export const mockAgenda: AgendaItem[] = [
  { id: 'a1', title: 'Write the methods section', meta: 'Chem 201 · step 3 of 6', minutes: 25, time: '2:00 PM' },
  { id: 'a2', title: 'Walk Biscuit', rrule: 'FREQ=DAILY', time: '6:00 PM' },
  { id: 'a3', title: 'Study for orgo midterm', suggestPlan: true },
  { id: 'a4', title: 'Reply to Prof. Alvarez', meta: 'History 110 · 9:14 AM', done: true },
];
