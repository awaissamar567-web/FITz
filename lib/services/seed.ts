import { supabaseAdmin, mockStore } from "@/lib/supabase/admin";
import { getOrCreateCompany } from "@/lib/services/companies";
import { memoryClients } from "@/lib/services/clients";
import { memoryCheckins } from "@/lib/services/checkins";
import { memoryPlans } from "@/lib/services/plans";
import { Client, Checkin, Plan } from "@/types/database";

export async function seedDemoData(companyWhopId = "biz_coach_alex") {
  const company = await getOrCreateCompany(companyWhopId);
  if (!company) {
    throw new Error("Failed to get or create company: " + companyWhopId);
  }

  // Update company settings
  await supabaseAdmin
    .from("companies")
    .update({
      coach_name: "Coach Alex Rivera",
      default_checkin_frequency: "weekly",
      units: "kg",
      at_risk_threshold_days: 7,
      plan: "free", // Free tier to demonstrate upgrade mechanics
    })
    .eq("id", company.id);

  // Clear existing mockStore entries for this company
  mockStore.clients = mockStore.clients.filter((c) => c.company_id !== company.id && c.company_id !== companyWhopId);
  mockStore.checkins = mockStore.checkins.filter((c) => c.company_id !== company.id && c.company_id !== companyWhopId);
  mockStore.plans = mockStore.plans.filter((p) => p.company_id !== company.id && p.company_id !== companyWhopId);

  // Clean remote Supabase clients for this company if connected
  try {
    await supabaseAdmin.from("clients").delete().eq("company_id", company.id);
  } catch (err) {
    console.warn("[Seed] Remote clients clean error:", err);
  }

  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Marcus Chen (Active, Progressing, Plan assigned, Recent check-in today)
  const marcusId = "client_user_marcus";
  const marcusClient: Client = {
    id: marcusId,
    company_id: company.id,
    whop_user_id: "user_marcus",
    display_name: "Marcus Chen",
    whop_experience_id: "exp_marcus",
    status: "active",
    goal: "Hypertrophy & Lean Bulk",
    experience_level: "intermediate",
    stats: { currentWeight: 83.8, targetWeight: 86.0, height: "182 cm", age: 26, gender: "Male" },
    equipment: { gymAccess: true, daysPerWeek: 4 },
    limitations: "Mild right shoulder tightness on heavy flat bench",
    intake_completed: true,
    joined_at: new Date(nowMs - 21 * dayMs).toISOString(),
  };

  const marcusPlan: any = {
    id: `plan_marcus_${Date.now()}`,
    company_id: company.id,
    client_id: marcusId,
    name: "Upper / Lower Power & Hypertrophy",
    split_name: "Upper / Lower Power & Hypertrophy",
    split: "Upper (Mon/Thu), Lower (Tue/Fri)",
    exercises: [
      { name: "Incline DB Press", sets: "4", reps: "8-10", notes: "30-deg incline, 2s eccentric pause" },
      { name: "Barbell Chest-Supported Row", sets: "4", reps: "8-10", notes: "Explosive pull, squeeze lats" },
      { name: "Bulgarian Split Squat", sets: "3", reps: "10-12", notes: "Knee tracking over middle toe" },
      { name: "Romanian Deadlift", sets: "3", reps: "8-10", notes: "Hips high, load hamstrings" },
      { name: "Cable Lateral Raises", sets: "4", reps: "15", notes: "Controlled tempo" },
    ],
    calories: 2750,
    protein_g: 190,
    carbs_g: 310,
    fats_g: 75,
    macros: { calories: 2750, protein: 190, carbs: 310, fat: 75 },
    notes: "Rest 90s between working sets. Focus on strict eccentric control on heavy presses.",
    created_at: new Date(nowMs - 14 * dayMs).toISOString(),
    updated_at: new Date(nowMs - 14 * dayMs).toISOString(),
  };

  const marcusCheckins: any[] = [
    {
      id: `chk_marcus_1_${Date.now()}`,
      company_id: company.id,
      client_id: marcusId,
      date: new Date(nowMs - 14 * dayMs).toISOString().split("T")[0],
      weight: 82.4,
      macro_hit: { hitTarget: true, calories: 2750, protein: 190 },
      photo_url: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80",
      notes: "Solid start to the new split. Upper day felt intense.",
      coach_feedback: "Great discipline hitting the calories! Form on DB press was spot-on.",
      created_at: new Date(nowMs - 14 * dayMs).toISOString(),
    },
    {
      id: `chk_marcus_2_${Date.now()}`,
      company_id: company.id,
      client_id: marcusId,
      date: new Date(nowMs - 7 * dayMs).toISOString().split("T")[0],
      weight: 83.1,
      macro_hit: { hitTarget: true, calories: 2780, protein: 195 },
      photo_url: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&auto=format&fit=crop&q=80",
      notes: "Hit all lifts. RDLs gave great hamstring pump.",
      coach_feedback: "Up 0.7kg cleanly. Keep current pacing into week 3.",
      created_at: new Date(nowMs - 7 * dayMs).toISOString(),
    },
    {
      id: `chk_marcus_3_${Date.now()}`,
      company_id: company.id,
      client_id: marcusId,
      date: new Date().toISOString().split("T")[0],
      weight: 83.8,
      macro_hit: { hitTarget: true, calories: 2800, protein: 192 },
      photo_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
      notes: "Hit new PR on Incline DB Press (42kg bells)! Energy and recovery are peak.",
      coach_feedback: "Outstanding work on that 42kg PR! Next week let's push for 10 reps on set 1.",
      created_at: new Date().toISOString(),
    },
  ];

  // 2. Sarah Jenkins (⚠️ At-Risk - 12 days since last check-in)
  const sarahId = "client_user_sarah";
  const sarahClient: Client = {
    id: sarahId,
    company_id: company.id,
    whop_user_id: "user_sarah",
    display_name: "Sarah Jenkins",
    whop_experience_id: "exp_sarah",
    status: "at_risk",
    goal: "Fat Loss & Core Strength",
    experience_level: "intermediate",
    stats: { currentWeight: 71.9, targetWeight: 66.0, height: "168 cm", age: 29, gender: "Female" },
    equipment: { gymAccess: true, daysPerWeek: 3 },
    limitations: "None",
    intake_completed: true,
    joined_at: new Date(nowMs - 30 * dayMs).toISOString(),
  };

  const sarahPlan: any = {
    id: `plan_sarah_${Date.now()}`,
    company_id: company.id,
    client_id: sarahId,
    name: "Full Body Metabolic & Tone Split",
    split_name: "Full Body Metabolic & Tone Split",
    split: "Full Body (Mon/Wed/Fri)",
    exercises: [
      { name: "Goblet Squats", sets: "4", reps: "12", notes: "Deep squat, keep chest up" },
      { name: "DB Shoulder Press", sets: "3", reps: "12", notes: "Strict form" },
      { name: "Plank Hold", sets: "3", reps: "45s", notes: "Glutes engaged" },
    ],
    calories: 1950,
    protein_g: 145,
    carbs_g: 180,
    fats_g: 55,
    macros: { calories: 1950, protein: 145, carbs: 180, fat: 55 },
    notes: "Focus on controlled heart rate intervals.",
    created_at: new Date(nowMs - 20 * dayMs).toISOString(),
    updated_at: new Date(nowMs - 20 * dayMs).toISOString(),
  };

  const sarahCheckins: any[] = [
    {
      id: `chk_sarah_1_${Date.now()}`,
      company_id: company.id,
      client_id: sarahId,
      date: new Date(nowMs - 12 * dayMs).toISOString().split("T")[0],
      weight: 71.9,
      macro_hit: { hitTarget: false },
      notes: "Busy travel week for work, struggled with protein target.",
      coach_feedback: "Travel weeks are tough. Let's aim for 2 quick hotel workouts this week.",
      created_at: new Date(nowMs - 12 * dayMs).toISOString(),
    },
  ];

  // 3. David Miller (Active, Conditioning + Strength, checked in 2 days ago)
  const davidId = "client_user_david";
  const davidClient: Client = {
    id: davidId,
    company_id: company.id,
    whop_user_id: "user_david",
    display_name: "David Miller",
    whop_experience_id: "exp_david",
    status: "active",
    goal: "Athletic Conditioning + Strength",
    experience_level: "advanced",
    stats: { currentWeight: 76.0, targetWeight: 75.0, height: "178 cm", age: 31, gender: "Male" },
    equipment: { gymAccess: true, daysPerWeek: 5 },
    limitations: "Prior ACL recovery, warm up knees with banded walks",
    intake_completed: true,
    joined_at: new Date(nowMs - 10 * dayMs).toISOString(),
  };

  const davidPlan: any = {
    id: `plan_david_${Date.now()}`,
    company_id: company.id,
    client_id: davidId,
    name: "Athletic Strength & Conditioning",
    split_name: "Athletic Strength & Conditioning",
    split: "Upper / Lower + Conditioning",
    exercises: [
      { name: "Front Squat", sets: "4", reps: "6-8", notes: "Elbows up, core tight" },
      { name: "Trap Bar Deadlift", sets: "3", reps: "8", notes: "Neutral grip" },
      { name: "Kettlebell Swings", sets: "4", reps: "15", notes: "Hip hinge power" },
    ],
    calories: 2600,
    protein_g: 175,
    carbs_g: 280,
    fats_g: 70,
    macros: { calories: 2600, protein: 175, carbs: 280, fat: 70 },
    notes: "Prioritize knee warmups before heavy compound lifts.",
    created_at: new Date(nowMs - 8 * dayMs).toISOString(),
    updated_at: new Date(nowMs - 8 * dayMs).toISOString(),
  };

  const davidCheckins: any[] = [
    {
      id: `chk_david_1_${Date.now()}`,
      company_id: company.id,
      client_id: davidId,
      date: new Date(nowMs - 2 * dayMs).toISOString().split("T")[0],
      weight: 76.0,
      macro_hit: { hitTarget: true, calories: 2600, protein: 175 },
      notes: "Conditioning runs feeling smooth. Knee feeling 100%.",
      coach_feedback: "Great to hear the knee is responding well! Keep the banded warmups consistent.",
      created_at: new Date(nowMs - 2 * dayMs).toISOString(),
    },
  ];

  // 4. Emma Watson (Intake Pending -> Test Onboarding)
  const emmaId = "client_user_emma";
  const emmaClient: Client = {
    id: emmaId,
    company_id: company.id,
    whop_user_id: "user_emma",
    display_name: "Emma Watson",
    whop_experience_id: "exp_emma",
    status: "active",
    goal: null,
    stats: { age: 24, gender: "Female" },
    experience_level: null,
    equipment: { gymAccess: true },
    limitations: null,
    intake_completed: false,
    joined_at: new Date(nowMs - 1 * dayMs).toISOString(),
  };

  // 5. Liam O'Connor (Cancelled member)
  const liamId = "client_user_liam";
  const liamClient: Client = {
    id: liamId,
    company_id: company.id,
    whop_user_id: "user_liam",
    display_name: "Liam O'Connor",
    whop_experience_id: "exp_liam",
    status: "cancelled",
    goal: "Bodybuilding",
    experience_level: "advanced",
    stats: { currentWeight: 88.0, targetWeight: 85.0, height: "185 cm", age: 28, gender: "Male" },
    equipment: { gymAccess: true },
    limitations: null,
    intake_completed: true,
    joined_at: new Date(nowMs - 45 * dayMs).toISOString(),
  };

  const allClients = [marcusClient, sarahClient, davidClient, emmaClient, liamClient];
  const allPlans = [marcusPlan, sarahPlan, davidPlan];
  const allCheckins = [...marcusCheckins, ...sarahCheckins, ...davidCheckins];

  // 1. Insert into Supabase Clients table
  try {
    for (const c of allClients) {
      await supabaseAdmin.from("clients").insert({
        id: c.id,
        company_id: company.id,
        whop_user_id: c.whop_user_id,
        whop_experience_id: c.whop_experience_id,
        display_name: c.display_name,
        status: c.status,
        goal: c.goal,
        stats: c.stats,
        experience_level: c.experience_level,
        equipment: c.equipment,
        limitations: c.limitations,
        intake_completed: c.intake_completed,
        joined_at: c.joined_at,
      });
    }
  } catch (err) {
    console.warn("[Seed] Supabase clients insert fallback:", err);
  }

  // 2. Populate global memoryClients
  for (const c of allClients) {
    memoryClients.set(c.id, c);
    memoryClients.set(c.whop_user_id, c);
    memoryClients.set(c.whop_experience_id, c);
    memoryClients.set(`${company.id}:${c.id}`, c);
    memoryClients.set(`${company.id}:${c.whop_user_id}`, c);
    memoryClients.set(`${company.id}:${c.whop_experience_id}`, c);
    memoryClients.set(`${companyWhopId}:${c.id}`, c);
    memoryClients.set(`${companyWhopId}:${c.whop_user_id}`, c);
    memoryClients.set(`${companyWhopId}:${c.whop_experience_id}`, c);
  }

  // 3. Populate global memoryPlans
  for (const p of allPlans) {
    memoryPlans.set(p.client_id, p);
    memoryPlans.set(`${company.id}:${p.client_id}`, p);
    memoryPlans.set(`${companyWhopId}:${p.client_id}`, p);
    const baseId = p.client_id.replace(/^client_/, "");
    if (baseId !== p.client_id) {
      memoryPlans.set(baseId, p);
      memoryPlans.set(`${company.id}:${baseId}`, p);
      memoryPlans.set(`${companyWhopId}:${baseId}`, p);
    }
  }

  // 4. Populate global memoryCheckins
  memoryCheckins.length = 0;
  for (const chk of allCheckins) {
    memoryCheckins.push(chk);
    memoryCheckins.push({ ...chk, company_id: companyWhopId });
    const baseId = chk.client_id.replace(/^client_/, "");
    if (baseId !== chk.client_id) {
      memoryCheckins.push({ ...chk, client_id: baseId });
      memoryCheckins.push({ ...chk, client_id: baseId, company_id: companyWhopId });
    }
  }

  // 5. Populate mockStore
  mockStore.clients.push(...allClients);
  mockStore.plans.push(...allPlans);
  mockStore.checkins.push(...allCheckins);

  return { company, clients: allClients };
}
