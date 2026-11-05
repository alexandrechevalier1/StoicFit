import type { Program, SetIntensity, SetLog, WorkoutStorageSchema } from '../models';

export const CURRENT_SCHEMA_VERSION = 2;

export type WorkoutData = Pick<WorkoutStorageSchema, 'programs' | 'setLogs'>;

export type ParsedWorkoutPayload = WorkoutData & {
  /** Version lue dans le stockage (avant migration). */
  storedVersion: number;
};

/** Données écrites par une version plus récente de l'app : on ne doit pas les écraser. */
export class NewerSchemaError extends Error {
  readonly storedVersion: number;

  constructor(storedVersion: number) {
    super(`Format de données v${storedVersion} plus récent que l'application (v${CURRENT_SCHEMA_VERSION})`);
    this.name = 'NewerSchemaError';
    this.storedVersion = storedVersion;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);

const asNumber = (value: unknown) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

const INTENSITIES: SetIntensity[] = ['faible', 'modere', 'intense'];
const asIntensity = (value: unknown): SetIntensity | undefined =>
  INTENSITIES.includes(value as SetIntensity) ? (value as SetIntensity) : undefined;

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// --- v1 : les séries étaient rangées dans programs[].seances[].exercises[].sets ---

function migrateV1(parsed: Record<string, unknown>): WorkoutData {
  const setLogs: SetLog[] = [];
  const knownIds = new Set<string>();

  const pushLog = (log: SetLog) => {
    if (knownIds.has(log.id)) return;
    knownIds.add(log.id);
    setLogs.push(log);
  };

  const programs: Program[] = asArray(parsed.programs).filter(isRecord).map((program) => {
    const programId = asString(program.id);
    const programName = asString(program.name);

    return {
      ...(program as unknown as Program),
      seances: asArray(program.seances).filter(isRecord).map((seance) => {
        const seanceId = asString(seance.id);
        const seanceName = asString(seance.name);

        return {
          ...(seance as unknown as Program['seances'][number]),
          exercises: asArray(seance.exercises).filter(isRecord).map((exercise) => {
            const { sets, ...definition } = exercise;
            const exerciseId = asString(exercise.id);

            asArray(sets).filter(isRecord).forEach((set, index) => {
              pushLog({
                id: asString(set.id, `${exerciseId}-v1-${index}`),
                programId,
                seanceId,
                exerciseId,
                programName,
                seanceName,
                exerciseName: asString(exercise.name),
                reps: asNumber(set.reps),
                weightKg: asNumber(set.weightKg),
                date: asString(set.date, asString(seance.date, new Date(0).toISOString())),
                intensity: asIntensity(set.intensity),
                bodyweight: set.bodyweight === true ? true : undefined,
              });
            });

            return definition as unknown as Program['seances'][number]['exercises'][number];
          }),
        };
      }),
    };
  });

  // Ancien historique (copies de séries) : on ne récupère que les séries absentes des programmes.
  asArray(parsed.history).filter(isRecord).forEach((entry) => {
    asArray(entry.exercises).filter(isRecord).forEach((exercise) => {
      asArray(exercise.sets).filter(isRecord).forEach((set, index) => {
        pushLog({
          id: asString(set.setId, asString(set.id, `${asString(entry.id)}-${index}`)),
          programId: asString(entry.programId),
          seanceId: asString(entry.seanceId),
          exerciseId: asString(exercise.exerciseId),
          programName: asString(entry.programName),
          seanceName: asString(entry.seanceName),
          exerciseName: asString(exercise.name),
          reps: asNumber(set.reps),
          weightKg: asNumber(set.weightKg),
          date: asString(set.performedAt, asString(entry.startedAt, new Date(0).toISOString())),
          bodyweight: set.bodyweight === true ? true : undefined,
        });
      });
    });
  });

  return { programs, setLogs };
}

/**
 * Lit le JSON stocké et le convertit au format courant.
 * Lève une erreur si le contenu est illisible, et `NewerSchemaError` s'il vient d'une version plus récente.
 */
export function parseWorkoutPayload(raw: string): ParsedWorkoutPayload {
  const parsed: unknown = JSON.parse(raw);

  if (!isRecord(parsed)) {
    throw new Error('Persisted payload is not an object');
  }
  if (!Array.isArray(parsed.programs)) {
    throw new Error('Persisted programs are invalid');
  }

  const storedVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 1;

  if (storedVersion > CURRENT_SCHEMA_VERSION) {
    throw new NewerSchemaError(storedVersion);
  }

  if (storedVersion < 2) {
    if (parsed.history !== undefined && !Array.isArray(parsed.history)) {
      throw new Error('Persisted history is invalid');
    }
    return { ...migrateV1(parsed), storedVersion };
  }

  if (!Array.isArray(parsed.setLogs)) {
    throw new Error('Persisted set logs are invalid');
  }

  return {
    programs: parsed.programs as Program[],
    setLogs: parsed.setLogs as SetLog[],
    storedVersion,
  };
}
