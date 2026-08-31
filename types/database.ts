export type UnitSystem = "kg" | "lbs";
export type CheckinFrequency = "daily" | "weekly";
export type CompanyPlan = "free" | "pro";
export type ClientStatus = "active" | "at_risk" | "cancelled";

export interface Company {
  id: string;
  whop_company_id: string;
  coach_name: string | null;
  default_checkin_frequency: CheckinFrequency;
  units: UnitSystem;
  at_risk_threshold_days?: number;
  avatar_url?: string | null;
  plan: CompanyPlan;
  free_client_ids?: string[] | null;
  pro_client_ids?: string[] | null;
  created_at: string;
}

export interface ClientStats {
  height?: string;
  currentWeight?: number;
  targetWeight?: number;
  age?: number;
  gender?: string;
}

export interface ClientEquipment {
  gymAccess: boolean;
  homeEquipment?: string[];
  daysPerWeek?: number;
}

export interface Client {
  id: string;
  company_id: string;
  whop_user_id: string;
  whop_experience_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  units_preference?: UnitSystem;
  status: ClientStatus;
  goal: string | null;
  stats: ClientStats;
  experience_level: string | null;
  equipment: ClientEquipment;
  limitations: string | null;
  intake_completed: boolean;
  joined_at: string;
}

export interface MacroAdherence {
  hitTarget?: boolean;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sodium?: number;
  sugar?: number;
  fiber?: number;
}

export interface Checkin {
  id: string;
  company_id: string;
  client_id: string;
  date: string;
  weight: number | null;
  photo_url: string | null;
  macro_hit: MacroAdherence;
  notes: string | null;
  coach_feedback?: string | null;
  created_at: string;
}

export interface ExerciseItem {
  name: string;
  sets: number | string;
  reps: number | string;
  notes?: string;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium?: number;
  sugar?: number;
  fiber?: number;
}

export type DayOfWeek = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface DayRoutine {
  day: DayOfWeek;
  splitName: string;
  exercises?: ExerciseItem[];
  notes?: string;
}

export interface Plan {
  id: string;
  company_id: string;
  client_id: string;
  split_name: string | null;
  exercises: ExerciseItem[];
  macros: MacroTargets;
  schedule?: DayRoutine[];
  pdf_url?: string | null;
  updated_at: string;
}

export interface WebhookEventRecord {
  id: string;
  whop_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed_at: string;
}
