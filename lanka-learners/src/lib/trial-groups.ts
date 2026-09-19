import { compareClassCodes } from "@/lib/vehicle-classes";

export type TrialClassRef = { id: string; code: string; name: string };

export type TrialGroup<T> = {
  /** Null for trials recorded before classes were tracked. */
  classRef: TrialClassRef | null;
  trials: T[];
};

/**
 * Sections a client's trials by vehicle class for the profile. Every assigned
 * class gets a section (even with no trials yet), a class that has trials but
 * was later unassigned still appears, and class-less trials come last.
 */
export function groupTrialsByClass<
  T extends { vehicleClass: TrialClassRef | null },
>(trials: T[], assigned: TrialClassRef[]): TrialGroup<T>[] {
  const byClass = new Map<string, { classRef: TrialClassRef; trials: T[] }>();
  for (const classRef of assigned) {
    byClass.set(classRef.id, { classRef, trials: [] });
  }

  const withoutClass: T[] = [];
  for (const trial of trials) {
    const classRef = trial.vehicleClass;
    if (!classRef) {
      withoutClass.push(trial);
      continue;
    }
    const group = byClass.get(classRef.id) ?? { classRef, trials: [] };
    group.trials.push(trial);
    byClass.set(classRef.id, group);
  }

  const groups: TrialGroup<T>[] = [...byClass.values()].sort((a, b) =>
    compareClassCodes(a.classRef.code, b.classRef.code)
  );

  return withoutClass.length > 0
    ? [...groups, { classRef: null, trials: withoutClass }]
    : groups;
}
