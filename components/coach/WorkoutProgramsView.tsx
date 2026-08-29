"use client";

import React, { useState, useEffect } from "react";
import {
  Dumbbell,
  Calendar,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Upload,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Utensils,
  User,
  ExternalLink,
  ArrowRight,
  X,
} from "lucide-react";
import { EnrichedClient } from "@/components/coach/ClientListTable";
import { DayOfWeek, DayRoutine, ExerciseItem } from "@/types/database";
import { ToastNotification, ToastMessage } from "@/components/ui/ToastNotification";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";

interface WorkoutProgramsViewProps {
  companyId: string;
  clients: EnrichedClient[];
  preSelectedClientId?: string | null;
  onClientSelect?: (clientId: string) => void;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  macros: { calories: string; protein: string; carbs: string; fats: string };
  schedule: { [day in DayOfWeek]: { splitName: string; exercises: ExerciseItem[] } };
}

const PREBUILT_TEMPLATES: Record<string, ProgramTemplate> = {
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

const DEFAULT_SCHEDULE: { [day in DayOfWeek]: { splitName: string; exercises: ExerciseItem[] } } = {
  Monday: { splitName: "", exercises: [] },
  Tuesday: { splitName: "", exercises: [] },
  Wednesday: { splitName: "", exercises: [] },
  Thursday: { splitName: "", exercises: [] },
  Friday: { splitName: "", exercises: [] },
  Saturday: { splitName: "", exercises: [] },
  Sunday: { splitName: "", exercises: [] },
};

export function WorkoutProgramsView({
  companyId,
  clients,
  preSelectedClientId,
}: WorkoutProgramsViewProps) {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("ppl");
  // Target member state
  const [selectedClientId, setSelectedClientId] = useState<string>(
    preSelectedClientId || (clients.length > 0 ? clients[0].id : "")
  );

  // Active day selected for exercise breakdown
  const [activeDay, setActiveDay] = useState<DayOfWeek>("Monday");

  // 7-day schedule & exercises map per client (Clean, unpopulated by default)
  const [scheduleState, setScheduleState] = useState<{
    [day in DayOfWeek]: { splitName: string; exercises: ExerciseItem[] };
  }>(DEFAULT_SCHEDULE);

  // Nutritional Macro targets (Clean, no pre-filled defaults)
  const [calories, setCalories] = useState<string>("");
  const [protein, setProtein] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [fats, setFats] = useState<string>("");
  const [sodium, setSodium] = useState<string>("");
  const [sugar, setSugar] = useState<string>("");
  const [fiber, setFiber] = useState<string>("");

  // PDF Routine Upload State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Status state & Toast notification
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Format client dropdown options
  const clientOptions: SelectOption[] = clients.map((c) => {
    const name = (c as any).display_name || c.whop_user_id;
    return {
      value: c.id,
      label: name,
      description: `@${c.whop_user_id}`,
    };
  });

  // Load selected client's unique custom plan whenever selectedClientId changes
  useEffect(() => {
    if (!selectedClientId) return;

    const fetchClientPlan = async () => {
      setLoadingPlan(true);
      try {
        const res = await fetch(`/api/coach/clients/${selectedClientId}?companyId=${companyId}`);
        const data = await res.json();

        if (data.plan) {
          const p = data.plan;

          // Load Macros
          if (p.macros) {
            setCalories(p.macros.calories ? String(p.macros.calories) : "2400");
            setProtein(p.macros.protein ? String(p.macros.protein) : "180");
            setCarbs(p.macros.carbs ? String(p.macros.carbs) : "250");
            setFats(p.macros.fat ? String(p.macros.fat) : "65");
            setSodium(p.macros.sodium ? String(p.macros.sodium) : "2300");
            setSugar(p.macros.sugar ? String(p.macros.sugar) : "35");
            setFiber(p.macros.fiber ? String(p.macros.fiber) : "30");
          }

          if (p.pdf_url) {
            setPdfUrl(p.pdf_url);
          }

          // Load 7-Day Schedule with per-day split names & exercises
          if (p.schedule && Array.isArray(p.schedule)) {
            const loadedSchedule: any = { ...DEFAULT_SCHEDULE };
            p.schedule.forEach((item: any) => {
              if (item.day) {
                loadedSchedule[item.day] = {
                  splitName: item.splitName || "Rest Day",
                  exercises: item.exercises || [],
                };
              }
            });
            setScheduleState(loadedSchedule);
          } else if (p.exercises && Array.isArray(p.exercises)) {
            // Backward compatibility if single exercise list
            const loadedSchedule: any = { ...DEFAULT_SCHEDULE };
            loadedSchedule.Monday = {
              splitName: p.split_name || "Custom Split",
              exercises: p.exercises,
            };
            setScheduleState(loadedSchedule);
          }
        } else {
          // Reset to clean template for new client (no pre-filled information)
          setScheduleState(DEFAULT_SCHEDULE);
          setCalories("");
          setProtein("");
          setCarbs("");
          setFats("");
          setSodium("");
          setSugar("");
          setFiber("");
          setPdfUrl(null);
        }
      } catch (err) {
        console.error("Failed to load client plan:", err);
      } finally {
        setLoadingPlan(false);
      }
    };

    fetchClientPlan();
  }, [selectedClientId, companyId]);

  // Handler to update the split name for a specific day
  const handleUpdateDaySplitName = (day: DayOfWeek, newName: string) => {
    setScheduleState((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        splitName: newName,
      },
    }));
  };

  // Handler to add exercise to the currently active day (clean blank item)
  const handleAddExerciseToActiveDay = () => {
    const currentDayData = scheduleState[activeDay] || { splitName: "", exercises: [] };
    const updatedExercises: ExerciseItem[] = [
      ...currentDayData.exercises,
      { name: "", sets: "", reps: "", notes: "" },
    ];

    setScheduleState((prev) => ({
      ...prev,
      [activeDay]: {
        ...currentDayData,
        exercises: updatedExercises,
      },
    }));
  };

  // Handler to update an exercise in the currently active day
  const handleUpdateExercise = (index: number, field: keyof ExerciseItem, val: any) => {
    const currentDayData = scheduleState[activeDay];
    const updatedExercises = [...currentDayData.exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: val };

    setScheduleState((prev) => ({
      ...prev,
      [activeDay]: {
        ...currentDayData,
        exercises: updatedExercises,
      },
    }));
  };

  // Handler to remove an exercise from active day
  const handleRemoveExercise = (index: number) => {
    const currentDayData = scheduleState[activeDay];
    const updatedExercises = currentDayData.exercises.filter((_, i) => i !== index);

    setScheduleState((prev) => ({
      ...prev,
      [activeDay]: {
        ...currentDayData,
        exercises: updatedExercises,
      },
    }));
  };

  // Handler for PDF routine file upload
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setToast({
          id: Date.now().toString(),
          type: "error",
          title: "Invalid Document",
          message: "Please select a valid .pdf file.",
        });
        return;
      }
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "PDF Attached",
        message: `${file.name} attached to routine.`,
      });
    }
  };

  // Save & Deploy Plan strictly to the selected client
  const handleSaveAndDeploy = async () => {
    if (!selectedClientId) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "No Client Selected",
        message: "Please select a target client to assign this routine to.",
      });
      return;
    }

    setSaving(true);

    try {
      // 1. Build DayRoutine schedule array
      const scheduleArray: DayRoutine[] = DAYS_OF_WEEK.map((day) => ({
        day,
        splitName: scheduleState[day].splitName || "Rest Day",
        exercises: scheduleState[day].exercises || [],
      }));

      // 2. Extract active day exercises for top-level reference
      const primaryExercises = scheduleState[activeDay]?.exercises || [];

      // 3. Send payload scoped strictly to selectedClientId
      const payload = {
        companyId,
        clientId: selectedClientId,
        split_name: scheduleState[activeDay]?.splitName || "Weekly Split",
        exercises: primaryExercises,
        macros: {
          calories: calories ? parseInt(calories) : 2000,
          protein: protein ? parseInt(protein) : 150,
          carbs: carbs ? parseInt(carbs) : 200,
          fat: fats ? parseInt(fats) : 65,
          sodium: sodium ? parseInt(sodium) : 2300,
          sugar: sugar ? parseInt(sugar) : 35,
          fiber: fiber ? parseInt(fiber) : 30,
        },
        schedule: scheduleArray,
        pdf_url: pdfUrl || undefined,
      };

      const res = await fetch("/api/coach/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign workout split");
      }

      const clientName = (selectedClient as any)?.display_name || selectedClient?.whop_user_id;
      setToast({
        id: Date.now().toString(),
        type: "success",
        title: "Plan Saved & Assigned",
        message: `Custom workout routine & 7-day schedule assigned strictly to ${clientName}.`,
      });
    } catch (err: any) {
      setToast({
        id: Date.now().toString(),
        type: "error",
        title: "Save Failed",
        message: err.message || "Failed to deploy workout plan",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handler for applying prebuilt workout program templates
  const handleApplyTemplate = () => {
    const template = PREBUILT_TEMPLATES[selectedTemplateKey];
    if (!template) return;

    setScheduleState(template.schedule);
    setCalories(template.macros.calories);
    setProtein(template.macros.protein);
    setCarbs(template.macros.carbs);
    setFats(template.macros.fats);

    setToast({
      id: Date.now().toString(),
      type: "success",
      title: "Program Template Loaded",
      message: `"${template.name}" applied across all 7 days with macro targets. You can now tweak and save for this client.`,
    });
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const activeDayData = scheduleState[activeDay] || { splitName: "", exercises: [] };
  const isRestDay = activeDayData.splitName.toLowerCase().includes("rest");

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification Container */}
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />

      {/* Header & Client Target Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 relative z-40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            Workout Splits & Routine Builder
          </h1>
        </div>

        {/* Client Selection Custom Dropdown */}
        <div className="flex items-center gap-3 bg-[#0c0c0e]/80 backdrop-blur-md p-2 rounded-2xl border border-white/[0.08] w-full sm:w-auto relative z-50">
          <div className="w-8 h-8 rounded-xl bg-[#1754d8]/15 border border-[#1754d8]/30 flex items-center justify-center text-[#1754d8] shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1 sm:w-64">
            <div className="text-3xs uppercase tracking-wider text-zinc-400 font-medium mb-1">
              Assign Routine To:
            </div>
            <CustomSelect
              value={selectedClientId}
              onChange={(newId) => setSelectedClientId(newId)}
              options={clientOptions}
              placeholder="Select a client..."
            />
          </div>
        </div>
      </div>

      {/* Reusable Program Templates Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1754d8]/15 border border-[#1754d8]/30 flex items-center justify-center text-[#1754d8] shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-display font-semibold text-white">Coaching Program Templates</h4>
            <p className="text-3xs text-zinc-400">Load a battle-tested routine across 7 days or tweak for this member.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedTemplateKey}
            onChange={(e) => setSelectedTemplateKey(e.target.value)}
            className="bg-black/50 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1754d8] flex-1 sm:w-60"
          >
            <option value="ppl">Push / Pull / Legs (PPL - 6-Day)</option>
            <option value="upper_lower">Upper / Lower Split (4-Day)</option>
            <option value="full_body">Full Body Metabolic (3-Day)</option>
            <option value="beginner">Beginner Dumbbells & Core (3-Day)</option>
          </select>

          <button
            type="button"
            onClick={handleApplyTemplate}
            className="py-2 px-3.5 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white text-xs font-medium transition-colors shrink-0 shadow-md shadow-[#1754d8]/20 flex items-center gap-1.5"
          >
            <span>Load Template</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: 7-Day Weekly Schedule (Left) + Selected Day Exercise Builder (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* =====================================================================
            LEFT COLUMN: 7-DAY WEEKLY SCHEDULE WITH EDITABLE SPLIT NAMES
            ===================================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base sm:text-lg font-display font-semibold text-white tracking-tight">
                Weekly Routine Schedule
              </h3>
              <span className="text-3xs text-zinc-400 font-mono">
                {selectedClient ? (selectedClient as any).display_name || selectedClient.whop_user_id : "Client"}
              </span>
            </div>

            {/* 7 Days Cards */}
            <div className="space-y-2 pt-1">
              {DAYS_OF_WEEK.map((day) => {
                const dayData = scheduleState[day] || { splitName: "Rest Day", exercises: [] };
                const isActive = activeDay === day;

                return (
                  <div
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isActive
                        ? "bg-[#1754d8]/15 border-[#1754d8] shadow-lg shadow-[#1754d8]/15"
                        : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          isActive ? "text-[#1754d8]" : "text-white"
                        }`}
                      >
                        {day}
                      </span>
                      <span className="text-3xs text-zinc-400 font-mono bg-white/[0.04] px-2 py-0.5 rounded-md">
                        {dayData.exercises.length} {dayData.exercises.length === 1 ? "exercise" : "exercises"}
                      </span>
                    </div>

                    {/* Editable Split Name Input for this Day */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={dayData.splitName}
                        onChange={(e) => handleUpdateDaySplitName(day, e.target.value)}
                        placeholder="Type split name (e.g. Push Day, Legs, Rest Day)"
                        className="w-full px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-medium focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8] transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* =====================================================================
            RIGHT COLUMN: EXERCISE BREAKDOWN FOR THE SELECTED DAY
            ===================================================================== */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-4">
            {/* Header with Active Day & Add Exercise Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-[#1754d8]" />
                  <h3 className="text-base sm:text-lg font-display font-semibold text-white tracking-tight">
                    {activeDay} Exercises
                  </h3>
                </div>
                <p className="text-xs text-[#1754d8] font-medium mt-0.5">
                  Split: {activeDayData.splitName || "Custom Split"}
                </p>
              </div>

              <button
                onClick={handleAddExerciseToActiveDay}
                className="py-2 px-3.5 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white text-xs font-medium shadow-md shadow-[#1754d8]/20 transition-all flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Exercise</span>
              </button>
            </div>

            {/* Exercise List */}
            {activeDayData.exercises.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center space-y-2">
                <Dumbbell className="w-8 h-8 mx-auto text-zinc-600" />
                <h4 className="text-xs font-medium text-zinc-300">
                  {isRestDay ? "Rest Day (No exercises scheduled)" : `No exercises added for ${activeDay}`}
                </h4>
                <p className="text-3xs text-zinc-500 max-w-xs mx-auto">
                  Click "+ Add Exercise" to add movements, sets, and rep targets for this split.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeDayData.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-3xs font-mono text-zinc-400 shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={ex.name}
                          onChange={(e) => handleUpdateExercise(idx, "name", e.target.value)}
                          placeholder="Exercise Name (e.g. Incline Bench Press)"
                          className="w-full px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-semibold focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
                        />
                      </div>

                      <button
                        onClick={() => handleRemoveExercise(idx)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/40 transition-all shrink-0"
                        title="Delete Exercise"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-3xs uppercase font-medium text-zinc-400 mb-1">
                          Sets
                        </label>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => handleUpdateExercise(idx, "sets", e.target.value === "" ? "" : parseInt(e.target.value) || "")}
                          placeholder="e.g. 4"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-mono focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
                        />
                      </div>

                      <div>
                        <label className="block text-3xs uppercase font-medium text-zinc-400 mb-1">
                          Reps / Target
                        </label>
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={(e) => handleUpdateExercise(idx, "reps", e.target.value)}
                          placeholder="e.g. 8-12 reps"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-mono focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
                        />
                      </div>

                      <div>
                        <label className="block text-3xs uppercase font-medium text-zinc-400 mb-1">
                          Coach Cue / Notes
                        </label>
                        <input
                          type="text"
                          value={ex.notes || ""}
                          onChange={(e) => handleUpdateExercise(idx, "notes", e.target.value)}
                          placeholder="e.g. RPE 8, slow tempo"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =====================================================================
              NUTRITIONAL MACRO TARGETS FOR THIS CLIENT
              ===================================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-[#1754d8]" />
                <h3 className="text-base font-display font-semibold text-white tracking-tight">
                  Nutrition & Daily Macro Targets
                </h3>
              </div>
              <span className="text-3xs text-zinc-400 font-mono">
                {selectedClient ? (selectedClient as any).display_name || selectedClient.whop_user_id : "Client"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-3xs uppercase font-medium text-zinc-400 mb-1">
                  Daily Calories
                </label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="e.g. 2400"
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-mono focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
                />
              </div>

              <div>
                <label className="block text-3xs uppercase font-medium text-zinc-400 mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="e.g. 180"
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-mono focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
                />
              </div>

              <div>
                <label className="block text-3xs uppercase font-medium text-zinc-400 mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-mono focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
                />
              </div>

              <div>
                <label className="block text-3xs uppercase font-medium text-zinc-400 mb-1">
                  Fats (g)
                </label>
                <input
                  type="number"
                  value={fats}
                  onChange={(e) => setFats(e.target.value)}
                  placeholder="e.g. 65"
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-[#0c0c0e]/90 text-white text-xs font-mono focus:outline-none focus:border-[#1754d8] focus:ring-1 focus:ring-[#1754d8]"
                />
              </div>
            </div>
          </div>

          {/* =====================================================================
              OPTIONAL PDF ROUTINE ATTACHMENT
              ===================================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0e]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/40 space-y-3">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2.5">
              <FileText className="w-4 h-4 text-[#1754d8]" />
              <h4 className="text-xs font-display font-semibold text-white">
                PDF Workout Guide / Full Program Attachment (Optional)
              </h4>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfChange}
                className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-white/[0.08] file:bg-white/[0.04] file:text-white file:text-xs file:font-medium hover:file:bg-white/[0.08] file:cursor-pointer"
              />

              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#1754d8] hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Attached PDF
                </a>
              )}
            </div>
          </div>

          {/* =====================================================================
              SAVE & DEPLOY BUTTON
              ===================================================================== */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSaveAndDeploy}
              disabled={saving}
              className="py-3 px-6 rounded-xl bg-[#1754d8] hover:bg-[#154ac0] active:scale-[0.98] text-white font-medium text-xs shadow-lg shadow-[#1754d8]/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving & Assigning Plan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save & Assign Plan to {(selectedClient as any)?.display_name || selectedClient?.whop_user_id || "Client"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
