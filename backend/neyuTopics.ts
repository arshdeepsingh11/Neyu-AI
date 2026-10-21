// Topics people ask Neyu about (Insights). Counted from questions; the questions
// themselves are never shown. Used by the daily totals job.
export const TOPICS: [string, RegExp][] = [
  ["Blood pressure", /blood pressure|hypertens|\bbp\b|systolic|diastolic/i],
  ["Cholesterol & lipids", /cholesterol|ldl|hdl|lipid|triglycer|statin/i],
  ["Heart rhythm & palpitations", /palpitat|arrhythm|afib|a-fib|fibrillation|irregular heart|heart rate|racing heart/i],
  ["Chest pain", /chest (pain|tight|pressure)|angina/i],
  ["Heart failure & swelling", /heart failure|swelling|edema|oedema|short(ness)? of breath|breathless/i],
  ["Diabetes & blood sugar", /diabet|blood sugar|glucose|a1c|insulin/i],
  ["Weight & nutrition", /weight|diet|nutrition|food|calorie|protein|fasting/i],
  ["Sleep", /sleep|insomnia|apnea|snor/i],
  ["Stress & mood", /stress|anxi|mood|burnout/i],
  ["Exercise & fitness", /exercis|workout|walk|steps|fitness|vo2|cardio/i],
  ["Thyroid & hormones", /thyroid|tsh|hormone|testosterone|estrogen|menopause/i],
  ["Longevity & aging", /longevit|aging|ageing|lifespan|biological age/i],
  ["Genetics & DNA", /gene|genetic|dna|genom|hereditary/i],
  ["Lab results", /lab result|blood test|results?\b|ferritin|vitamin d|b12|crp/i],
  ["Booking & visits", /appointment|book|referral|visit|doctor|specialist|clinic hours/i],
  ["Cost & coverage", /cost|price|insurance|covered|ahs|fee|pay/i],
  ["Tests & imaging", /echo|ecg|ekg|holter|stress test|ultrasound|imaging|monitor/i],
];
