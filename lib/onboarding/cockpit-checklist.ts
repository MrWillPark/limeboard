import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'burnline.cockpitChecklist.v1';

export type ChecklistStepId = 'connect' | 'runway' | 'desk';

export type ChecklistState = {
  dismissed: boolean;
  completed: Partial<Record<ChecklistStepId, boolean>>;
};

const DEFAULT_STATE: ChecklistState = {
  dismissed: false,
  completed: {},
};

export async function loadChecklistState(): Promise<ChecklistState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, completed: {} };
    const parsed = JSON.parse(raw) as ChecklistState;
    return {
      dismissed: Boolean(parsed.dismissed),
      completed: { ...(parsed.completed ?? {}) },
    };
  } catch {
    return { ...DEFAULT_STATE, completed: {} };
  }
}

export async function saveChecklistState(state: ChecklistState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function markChecklistStep(step: ChecklistStepId): Promise<ChecklistState> {
  const current = await loadChecklistState();
  const next: ChecklistState = {
    ...current,
    completed: { ...current.completed, [step]: true },
  };
  await saveChecklistState(next);
  return next;
}

export async function dismissChecklist(): Promise<ChecklistState> {
  const current = await loadChecklistState();
  const next: ChecklistState = { ...current, dismissed: true };
  await saveChecklistState(next);
  return next;
}
