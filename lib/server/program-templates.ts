import type { DayOfWeek, ExerciseItem } from "@/types/database";
export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  macros: { calories: string; protein: string; carbs: string; fats: string };
  schedule: { [day in DayOfWeek]: { splitName: string; exercises: ExerciseItem[] } };
}

export const PREBUILT_TEMPLATES: Record<string, ProgramTemplate> = {
  ppl: {
    id: "ppl",
    name: "Push / Pull / Legs (PPL - 6-Day)",
    description: "High-volume hypertrophy split targeting chest, back, and legs twice weekly.",
    macros: { calories: "2800", protein: "195", carbs: "310", fats: "75" },
    schedule: {
      Monday: {
        splitName: "Push (Chest, Delts & Triceps)",
        exercises: [
          { name: "Incline Dumbbell Press", sets: "4", reps: "8-10", notes: "30-deg bench, 2s eccentric pause" },
          { name: "Barbell Bench Press", sets: "3", reps: "6-8", notes: "Control descent, touch lower chest" },
          { name: "Standing Overhead DB Press", sets: "3", reps: "10-12", notes: "Full range of motion" },
          { name: "Cable Lateral Raises", sets: "4", reps: "15", notes: "Constant tension on side delts" },
          { name: "Tricep Rope Pushdowns", sets: "3", reps: "12-15", notes: "Flare ropes at full lockout" },
        ],
      },
      Tuesday: {
        splitName: "Pull (Back, Lats & Biceps)",
        exercises: [
          { name: "Conventional Deadlift", sets: "3", reps: "5", notes: "Reset hips between reps" },
          { name: "Chest-Supported Row", sets: "4", reps: "8-10", notes: "Squeeze shoulder blades" },
          { name: "Wide-Grip Lat Pulldown", sets: "3", reps: "10-12", notes: "Drive elbows to ribs" },
          { name: "Face Pulls", sets: "4", reps: "15", notes: "External rotation focus" },
          { name: "Incline DB Bicep Curls", sets: "3", reps: "10-12", notes: "Supinate at top" },
        ],
      },
      Wednesday: {
        splitName: "Legs & Calves",
        exercises: [
          { name: "Barbell Back Squat", sets: "4", reps: "6-8", notes: "Parallel depth, brace core" },
          { name: "Romanian Deadlift (RDL)", sets: "3", reps: "8-10", notes: "Push hips back, feel hamstring stretch" },
          { name: "Bulgarian Split Squats", sets: "3", reps: "10-12", notes: "Knee in line with middle toe" },
          { name: "Standing Calf Raises", sets: "4", reps: "15", notes: "2s pause at peak" },
        ],
      },
      Thursday: {
        splitName: "Push Hypertrophy",
        exercises: [
          { name: "Incline Smith Machine Press", sets: "4", reps: "10-12", notes: "Controlled tempo" },
          { name: "Dumbbell Flyes", sets: "3", reps: "12", notes: "Deep stretch at bottom" },
          { name: "DB Lateral Raises", sets: "4", reps: "15", notes: "Strict form, no swinging" },
          { name: "Overhead Cable Extension", sets: "3", reps: "12-15", notes: "Long head tricep focus" },
        ],
      },
      Friday: {
        splitName: "Pull & Lats Hypertrophy",
        exercises: [
          { name: "Weighted Pull-Ups", sets: "3", reps: "6-8", notes: "Add weight belt if needed" },
          { name: "Neutral-Grip Cable Rows", sets: "4", reps: "10-12", notes: "Pull with elbows" },
          { name: "Straight-Arm Cable Pulldown", sets: "3", reps: "15", notes: "Isolate lats" },
          { name: "Hammer Curls", sets: "3", reps: "12", notes: "Brachialis focus" },
        ],
      },
      Saturday: {
        splitName: "Legs & Hamstring Focus",
        exercises: [
          { name: "Front Squats", sets: "4", reps: "8-10", notes: "High elbows, upright torso" },
          { name: "Lying Leg Curls", sets: "4", reps: "12", notes: "Slow 3s eccentric" },
          { name: "Leg Press", sets: "3", reps: "15", notes: "Feet shoulder-width" },
          { name: "Seated Calf Raises", sets: "4", reps: "15", notes: "Full stretch" },
        ],
      },
      Sunday: {
        splitName: "Rest & Recovery",
        exercises: [],
      },
    },
  },
  upper_lower: {
    id: "upper_lower",
    name: "Upper / Lower Split (4-Day)",
    description: "Balanced powerbuilding routine alternating upper and lower sessions.",
    macros: { calories: "2650", protein: "185", carbs: "290", fats: "70" },
    schedule: {
      Monday: {
        splitName: "Upper Power",
        exercises: [
          { name: "Barbell Bench Press", sets: "4", reps: "5", notes: "Heavy power work" },
          { name: "Bent-Over Barbell Row", sets: "4", reps: "6-8", notes: "Torso 45 degrees" },
          { name: "Standing Overhead Press", sets: "3", reps: "6", notes: "Strict overhead pressing" },
          { name: "Pull-Ups", sets: "3", reps: "8", notes: "Full lockout" },
        ],
      },
      Tuesday: {
        splitName: "Lower Power",
        exercises: [
          { name: "Barbell Back Squat", sets: "4", reps: "5", notes: "Power work, brace firmly" },
          { name: "Romanian Deadlift", sets: "3", reps: "6-8", notes: "Heavy loading" },
          { name: "Leg Press", sets: "3", reps: "10", notes: "Deep knee bend" },
          { name: "Hanging Leg Raises", sets: "3", reps: "15", notes: "Core compression" },
        ],
      },
      Wednesday: { splitName: "Rest & Active Recovery", exercises: [] },
      Thursday: {
        splitName: "Upper Hypertrophy",
        exercises: [
          { name: "Incline DB Press", sets: "4", reps: "8-10", notes: "Squeeze upper pecs" },
          { name: "Lat Pulldown", sets: "4", reps: "10-12", notes: "Pause at bottom" },
          { name: "Dumbbell Lateral Raises", sets: "4", reps: "12-15", notes: "Side delts" },
          { name: "Incline DB Curls", sets: "3", reps: "12", notes: "Bicep peak" },
          { name: "Cable Tricep Pushdown", sets: "3", reps: "12-15", notes: "Tricep pump" },
        ],
      },
      Friday: {
        splitName: "Lower Hypertrophy",
        exercises: [
          { name: "Bulgarian Split Squats", sets: "3", reps: "10-12", notes: "Quads & glutes" },
          { name: "Barbell Hip Thrusts", sets: "4", reps: "10-12", notes: "Glute lockout" },
          { name: "Seated Leg Extensions", sets: "3", reps: "15", notes: "Quad pump" },
          { name: "Lying Hamstring Curls", sets: "3", reps: "15", notes: "Slow negative" },
        ],
      },
      Saturday: { splitName: "Rest Day", exercises: [] },
      Sunday: { splitName: "Rest Day", exercises: [] },
    },
  },
  full_body: {
    id: "full_body",
    name: "Full Body Metabolic (3-Day)",
    description: "Efficient whole-body training designed for fat loss, conditioning, and joint health.",
    macros: { calories: "2050", protein: "155", carbs: "190", fats: "55" },
    schedule: {
      Monday: {
        splitName: "Full Body A (Strength Focus)",
        exercises: [
          { name: "Goblet Squats", sets: "4", reps: "10-12", notes: "Deep squat, keep chest up" },
          { name: "DB Flat Bench Press", sets: "3", reps: "10-12", notes: "Controlled pressing" },
          { name: "Lat Pulldowns", sets: "3", reps: "10-12", notes: "Full stretch" },
          { name: "Plank Hold", sets: "3", reps: "45s", notes: "Brace glutes and abs" },
        ],
      },
      Tuesday: { splitName: "Rest & Walking", exercises: [] },
      Wednesday: {
        splitName: "Full Body B (Hypertrophy)",
        exercises: [
          { name: "Romanian Deadlifts", sets: "3", reps: "10-12", notes: "Hamstrings & glutes" },
          { name: "DB Shoulder Press", sets: "3", reps: "12", notes: "Strict overhead" },
          { name: "Cable Seated Rows", sets: "3", reps: "12", notes: "Mid-back thickness" },
          { name: "Walking Lunges", sets: "3", reps: "12", notes: "12 per leg" },
        ],
      },
      Thursday: { splitName: "Rest Day", exercises: [] },
      Friday: {
        splitName: "Full Body C (Metabolic Conditioning)",
        exercises: [
          { name: "Leg Press", sets: "3", reps: "15", notes: "Continuous tension" },
          { name: "Push-Ups", sets: "3", reps: "15", notes: "Bodyweight form" },
          { name: "Face Pulls", sets: "3", reps: "15", notes: "Shoulder health" },
          { name: "Kettlebell Swings", sets: "4", reps: "20", notes: "Explosive hip drive" },
        ],
      },
      Saturday: { splitName: "Rest Day", exercises: [] },
      Sunday: { splitName: "Rest Day", exercises: [] },
    },
  },
  beginner: {
    id: "beginner",
    name: "Beginner Dumbbells & Core (3-Day)",
    description: "Foundational strength habit program using minimal dumbbell and bodyweight equipment.",
    macros: { calories: "2200", protein: "160", carbs: "220", fats: "60" },
    schedule: {
      Monday: {
        splitName: "Dumbbells Upper & Core",
        exercises: [
          { name: "DB Floor Press", sets: "3", reps: "10-12", notes: "Safe shoulder position" },
          { name: "DB Two-Arm Row", sets: "3", reps: "10-12", notes: "Flat back" },
          { name: "DB Lateral Raises", sets: "3", reps: "12", notes: "Light weights" },
          { name: "Deadbug", sets: "3", reps: "10", notes: "Controlled core" },
        ],
      },
      Tuesday: { splitName: "Rest Day", exercises: [] },
      Wednesday: {
        splitName: "Dumbbells Lower Body",
        exercises: [
          { name: "DB Goblet Squats", sets: "3", reps: "10-12", notes: "Hold bell at chest" },
          { name: "DB Romanian Deadlifts", sets: "3", reps: "10-12", notes: "Hinge at hips" },
          { name: "Glute Bridges", sets: "3", reps: "15", notes: "2s squeeze at top" },
          { name: "Standing Calf Raises", sets: "3", reps: "15", notes: "Full range" },
        ],
      },
      Thursday: { splitName: "Rest Day", exercises: [] },
      Friday: {
        splitName: "Full Body Circuit",
        exercises: [
          { name: "DB Thrusters", sets: "3", reps: "10", notes: "Squat to overhead press" },
          { name: "DB Bicep Curl to Press", sets: "3", reps: "10", notes: "Smooth transition" },
          { name: "Bird-Dog", sets: "3", reps: "10", notes: "Per side" },
          { name: "Mountain Climbers", sets: "3", reps: "30s", notes: "Cardio conditioning" },
        ],
      },
      Saturday: { splitName: "Rest Day", exercises: [] },
      Sunday: { splitName: "Rest Day", exercises: [] },
    },
  },
};
