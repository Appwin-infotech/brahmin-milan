import { validateImageFiles } from "./imageValidation.js";

export function validateSubscriptionPlan(plan, photo, { creating = false } = {}) {
  if (!["Biodata", "Pandit", "Kathavachak", "Jyotish"].includes(plan.profileType)) {
    return "Please select a valid profile type.";
  }
  for (const [field, label] of [["trialPeriod", "Trial period"], ["duration", "Duration"], ["amount", "Amount"]]) {
    if (String(plan[field] ?? "").trim() === "" || !Number.isFinite(Number(plan[field]))) {
      return `${label} is required and must be a valid number.`;
    }
  }
  if (!String(plan.description ?? "").trim()) return "Description is required.";
  return validateImageFiles(photo ? [photo] : [], {
    maxFiles: 1,
    required: creating || !plan.photoUrl,
  });
}
