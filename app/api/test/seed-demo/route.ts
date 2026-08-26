import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, mockStore } from "@/lib/supabase/admin";
import { getOrCreateCompany } from "@/lib/services/companies";

export async function POST(req: NextRequest) {
  try {
    const companyWhopId = "biz_coach_alex";
    const company = await getOrCreateCompany(companyWhopId);

    if (!company) {
      return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
    }

    // Update company settings
    await supabaseAdmin
      .from("companies")
      .update({
        coach_name: "Coach Alex Rivera",
        default_checkin_frequency: "weekly",
        units: "kg",
        at_risk_threshold_days: 7,
        plan: "pro",
      })
      .eq("id", company.id);

    // Reset tables for this company
    mockStore.clients = mockStore.clients.filter((c) => c.company_id !== company.id);
    mockStore.checkins = mockStore.checkins.filter((c) => c.company_id !== company.id);
    mockStore.plans = mockStore.plans.filter((p) => p.company_id !== company.id);

    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // 1. Marcus Chen (Active, Progressing, Plan assigned, Recent checkin)
    const marcusId = `client_marcus_${Date.now()}`;
    mockStore.clients.push({
      id: marcusId,
      company_id: company.id,
      whop_user_id: "user_marcus",
      display_name: "Marcus Chen",
      whop_experience_id: "exp_marcus",
      status: "active",
      goal: "Hypertrophy & Lean Bulk",
      weight_kg: 82.0,
      height_cm: 182,
      training_days_per_week: 4,
      equipment_access: "Commercial Gym",
      injuries_limitations: "Mild right shoulder tightness on heavy flat bench",
      stats: { currentWeight: 82.0, targetWeight: 86.0, height: "182 cm", age: 26, gender: "Male" },
      equipment: { gymAccess: true, barbell: true, dumbbells: true, cables: true, daysPerWeek: 4 },
      limitations: "Mild right shoulder tightness on heavy flat bench",
      intake_completed: true,
      joined_at: new Date(nowMs - 21 * dayMs).toISOString(),
    });

    mockStore.plans.push({
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
      notes: "Rest 90s between working sets. Stay hydrated.",
      created_at: new Date(nowMs - 14 * dayMs).toISOString(),
      updated_at: new Date(nowMs - 14 * dayMs).toISOString(),
    });

    mockStore.checkins.push(
      {
        id: `chk_marcus_1_${Date.now()}`,
        company_id: company.id,
        client_id: marcusId,
        date: new Date(nowMs - 14 * dayMs).toISOString().split("T")[0],
        weight: 82.4,
        macro_hit: { hitTarget: true, calories: 2750, protein: 190 },
        photo_url: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80",
        notes: "Solid start to the new split. Upper day felt intense.",
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
        created_at: new Date().toISOString(),
      }
    );

    // 2. Sarah Jenkins (⚠️ At-Risk - 12 days since last checkin)
    const sarahId = `client_sarah_${Date.now()}`;
    mockStore.clients.push({
      id: sarahId,
      company_id: company.id,
      whop_user_id: "user_sarah",
      display_name: "Sarah Jenkins",
      whop_experience_id: "exp_sarah",
      status: "at_risk",
      goal: "Fat Loss & Core Strength",
      weight_kg: 72.5,
      height_cm: 168,
      training_days_per_week: 3,
      equipment_access: "Commercial Gym",
      injuries_limitations: "None",
      stats: { currentWeight: 72.5, targetWeight: 66.0, height: "168 cm", age: 29, gender: "Female" },
      equipment: { gymAccess: true, dumbbells: true, resistanceBands: true, daysPerWeek: 3 },
      limitations: "None",
      intake_completed: true,
      joined_at: new Date(nowMs - 30 * dayMs).toISOString(),
    });

    mockStore.plans.push({
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
    });

    mockStore.checkins.push({
      id: `chk_sarah_1_${Date.now()}`,
      company_id: company.id,
      client_id: sarahId,
      date: new Date(nowMs - 12 * dayMs).toISOString().split("T")[0],
      weight: 71.9,
      macro_hit: { hitTarget: false },
      notes: "Busy travel week for work, struggled with protein target.",
      created_at: new Date(nowMs - 12 * dayMs).toISOString(),
    });

    // 3. David Miller (Active, Strength Conditioning)
    const davidId = `client_david_${Date.now()}`;
    mockStore.clients.push({
      id: davidId,
      company_id: company.id,
      whop_user_id: "user_david",
      display_name: "David Miller",
      whop_experience_id: "exp_david",
      status: "active",
      goal: "Athletic Conditioning + Strength",
      weight_kg: 76.2,
      height_cm: 178,
      training_days_per_week: 5,
      equipment_access: "Commercial Gym",
      stats: { currentWeight: 76.2, targetWeight: 75.0, height: "178 cm", age: 31, gender: "Male" },
      equipment: { gymAccess: true, daysPerWeek: 5 },
      limitations: "Prior ACL recovery, warm up knees with banded walks",
      intake_completed: true,
      joined_at: new Date(nowMs - 10 * dayMs).toISOString(),
    });

    mockStore.checkins.push({
      id: `chk_david_1_${Date.now()}`,
      company_id: company.id,
      client_id: davidId,
      date: new Date(nowMs - 2 * dayMs).toISOString().split("T")[0],
      weight: 76.0,
      macro_hit: { hitTarget: true, calories: 2600, protein: 175 },
      notes: "Conditioning runs feeling smooth. Knee feeling 100%.",
      created_at: new Date(nowMs - 2 * dayMs).toISOString(),
    });

    // 4. Emma Watson (Intake Pending -> Test Onboarding)
    const emmaId = `client_emma_${Date.now()}`;
    mockStore.clients.push({
      id: emmaId,
      company_id: company.id,
      whop_user_id: "user_emma",
      display_name: "Emma Watson",
      whop_experience_id: "exp_emma",
      status: "active",
      goal: null,
      stats: { age: 24, gender: "Female" },
      intake_completed: false,
      joined_at: new Date(nowMs - 1 * dayMs).toISOString(),
    });

    // 5. Liam O'Connor (Cancelled)
    mockStore.clients.push({
      id: `client_liam_${Date.now()}`,
      company_id: company.id,
      whop_user_id: "user_liam",
      display_name: "Liam O'Connor",
      whop_experience_id: "exp_liam",
      status: "cancelled",
      goal: "Bodybuilding",
      stats: { currentWeight: 88.0, targetWeight: 85.0, height: "185 cm", age: 28, gender: "Male" },
      intake_completed: true,
      joined_at: new Date(nowMs - 45 * dayMs).toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Sandbox seeded successfully with Coach Alex Rivera and 5 diverse clients!",
      companyId: companyWhopId,
      clients: [
        { name: "Marcus Chen", id: "user_marcus", expId: "exp_marcus", status: "active", description: "Active member with assigned workout split, macros, and photo timeline" },
        { name: "Sarah Jenkins", id: "user_sarah", expId: "exp_sarah", status: "at_risk", description: "At-risk member (12 days since last check-in) with amber badge and Whop message action" },
        { name: "David Miller", id: "user_david", expId: "exp_david", status: "active", description: "Active member with recent check-in" },
        { name: "Emma Watson", id: "user_emma", expId: "exp_emma", status: "intake_pending", description: "New member with uncompleted intake to test onboarding form" },
        { name: "Liam O'Connor", id: "user_liam", expId: "exp_liam", status: "cancelled", description: "Deactivated member in cancelled filter" },
      ],
    });
  } catch (error) {
    console.error("[Seed Demo API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
