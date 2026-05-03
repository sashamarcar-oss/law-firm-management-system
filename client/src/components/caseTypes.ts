// src/constants/caseTypes.ts
export const CASE_TYPES = [
  "Constitutional Law",
  "Criminal Law",
  "Civil Law",
  "Family Law",
  "Commercial / Business Law",
  "Property / Land Law",
  "Labour / Employment Law",
  "Environmental Law",
  "Human Rights Law",
  "Administrative Law",
  "Tax Law",
  "Intellectual Property Law",
  "Succession / Probate Law",
  "Contract Law",
  "Tort Law",
  "Consumer Protection Law",
  "Juvenile / Children Law",
  "Maritime / Shipping Law",
  "Immigration Law",
] as const;

// Optional: create a type for stronger typing
export type CaseType = typeof CASE_TYPES[number];