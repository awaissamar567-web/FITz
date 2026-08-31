import type { Company } from "@/types/database";

export const COACH_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const COACH_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function hasCoachProfile(company: Company): boolean {
  return Boolean(company.coach_onboarded_at && company.coach_name?.trim() &&
    company.coach_expertise?.trim() && Number.isInteger(company.coach_years_experience) &&
    company.coach_years_experience! >= 0 && company.coach_years_experience! <= 80);
}

export function validateCoachProfile(name: unknown, years: unknown, expertise: unknown) {
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    return "Enter a coach name between 2 and 80 characters.";
  }
  if (typeof years !== "number" || !Number.isInteger(years) || years < 0 || years > 80) {
    return "Enter whole years of experience from 0 to 80.";
  }
  if (typeof expertise !== "string" || expertise.trim().length < 2 || expertise.trim().length > 120) {
    return "Enter your main expertise between 2 and 120 characters.";
  }
  return null;
}

export function coachPhotoMatchesType(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/png") return bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  if (mime === "image/jpeg") return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/webp") return bytes.length >= 16 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}
