/**
 * Utility helpers to safely format and normalize exercises, plans, and macros
 * across both string[] and ExerciseItem[] schema structures.
 */

export interface FormattedExercise {
  title: string;
  subtitle?: string;
  rawString: string;
}

export function formatExercise(exercise: any): FormattedExercise {
  if (!exercise) {
    return { title: "Exercise", rawString: "Exercise" };
  }

  if (typeof exercise === "string") {
    return { title: exercise, rawString: exercise };
  }

  if (typeof exercise === "object") {
    const title = exercise.name || exercise.title || "Exercise";
    const sets = exercise.sets ? `${exercise.sets} sets` : "";
    const reps = exercise.reps ? `${exercise.reps} reps` : "";
    const setsReps = [sets, reps].filter(Boolean).join(" x ");
    const notes = exercise.notes ? `(${exercise.notes})` : "";
    const subtitle = [setsReps, notes].filter(Boolean).join(" • ");
    const rawString = [title, setsReps, notes].filter(Boolean).join(" - ");

    return {
      title,
      subtitle: subtitle || undefined,
      rawString,
    };
  }

  return { title: String(exercise), rawString: String(exercise) };
}

export function normalizePlan(plan: any) {
  if (!plan) return null;

  const name = plan.split_name || plan.name || "Custom Routine";
  const split = plan.split || plan.schedule || "Custom Split Schedule";
  const notes = plan.notes || "";

  // Normalize exercises array
  const rawExercises = Array.isArray(plan.exercises) ? plan.exercises : [];
  const exercises = rawExercises.map(formatExercise);

  // Normalize macros & micros
  const calories = plan.macros?.calories ?? plan.calories ?? null;
  const protein = plan.macros?.protein ?? plan.protein_g ?? null;
  const carbs = plan.macros?.carbs ?? plan.carbs_g ?? null;
  const fats = plan.macros?.fat ?? plan.macros?.fats ?? plan.fats_g ?? null;
  const sodium = plan.macros?.sodium ?? plan.sodium_mg ?? null;
  const sugar = plan.macros?.sugar ?? plan.sugar_g ?? null;
  const fiber = plan.macros?.fiber ?? plan.fiber_g ?? null;

  return {
    ...plan,
    name,
    split,
    notes,
    exercises,
    calories,
    protein,
    carbs,
    fats,
    sodium,
    sugar,
    fiber,
  };
}
