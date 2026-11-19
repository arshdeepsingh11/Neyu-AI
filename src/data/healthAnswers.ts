// Health Answers — plain-language answers to the questions people type into Google
// and AI assistants. Each one starts with a short direct answer (what search and AI
// engines quote), then when to get help, how NEYU helps and a few FAQs.
//
// Content rules: general information only, never a diagnosis; emergencies → 911;
// numbers only from Canadian guidance (Hypertension Canada, Diabetes Canada, CCS)
// or facts already published on this site.
//
// Medical review: set REVIEWER once a NEYU physician has reviewed the articles.
// Until then pages say "Written by NEYU Health" and no reviewer is claimed.

export const REVIEWER: { name: string; title: string; date: string } = { name: "", title: "", date: "" };
export const UPDATED = "2026-11-04";

export type HaLink = { label: string; href: string };
export type HaSection = { h: string; p?: string[]; list?: string[] };
export interface HealthAnswer {
  slug: string;
  q: string;              // the question, used as the H1
  title: string;          // search title (≤ ~55 chars, " | NEYU Health" is added)
  description: string;    // 120–160 characters
  topic: "Heart" | "Blood pressure" | "Tests" | "Genetics & longevity" | "Everyday health";
  about: { type: "MedicalCondition" | "MedicalTest" | "MedicalSignOrSymptom"; name: string };
  answer: string;         // 2–3 sentence direct answer
  sections: HaSection[];
  urgent?: string;        // when to call 911
  seeDoctor: string[];    // when to book a visit
  links: HaLink[];        // NEYU pages that help
  faq: { q: string; a: string }[];
}

const L = {
  cardiology: { label: "Cardiology in Calgary", href: "/specialties/cardiology" },
  monitoring: { label: "Holter & blood pressure monitoring", href: "/diagnostics/monitoring" },
  holterLanding: { label: "Holter monitor in Calgary", href: "/holter-monitor-calgary" },
  imaging: { label: "Echocardiogram in Calgary", href: "/diagnostics/cardiac-imaging" },
  stress: { label: "Stress echo & stress testing", href: "/diagnostics/stress-testing" },
  pulmonary: { label: "Pulmonary function testing", href: "/diagnostics/pulmonary" },
  htn: { label: "Virtual Hypertension Clinic", href: "/hypertension-clinic" },
  symptoms: { label: "Heart symptoms guide + AI symptom check", href: "/cardiac-symptoms" },
  virtual: { label: "Virtual care visit", href: "/virtual-care" },
  labs: { label: "Lab Result Explainer (free AI tool)", href: "/lab-results" },
  atHome: { label: "At-home blood test in Calgary", href: "/blood-test-at-home-calgary" },
  dna: { label: "DNA & genetic testing in Calgary", href: "/dna-test-calgary" },
  genomics: { label: "Genomics & precision testing", href: "/genomics" },
  bioAge: { label: "Biological age test in Calgary", href: "/biological-age-test-calgary" },
  longevityLab: { label: "Longevity Lab", href: "/longevity-lab" },
  exec: { label: "Executive health check in Calgary", href: "/executive-health-check-calgary" },
  endo: { label: "Endocrinology in Calgary", href: "/specialties/endocrinology" },
  internal: { label: "Internal medicine in Calgary", href: "/specialties/internal-medicine" },
  respiratory: { label: "Respiratory & sleep medicine", href: "/specialties/respiratory-medicine" },
  heartFailure: { label: "Heart failure clinic", href: "/specialties/heart-failure-clinic" },
  vascular: { label: "Carotid ultrasound & ABI testing", href: "/diagnostics/vascular" },
  myHealth: { label: "My Health Space — your health record", href: "/my-health/sign-up" },
  referral: { label: "Referral Centre (for doctors)", href: "/referral-centre" },
};

const CALL_911 = "Call 911 right away for chest pain or pressure, trouble breathing, fainting, sudden weakness or numbness on one side, confusion, or trouble speaking. Don't drive yourself.";

export const HEALTH_ANSWERS: HealthAnswer[] = [
  {
    slug: "why-is-my-heart-racing-at-night", topic: "Heart",
    q: "Why is my heart racing at night?", title: "Why Is My Heart Racing at Night?",
    description: "Common reasons your heart races or pounds at night, from caffeine and stress to heart rhythm problems, plus when to see a doctor and when to call 911.",
    about: { type: "MedicalSignOrSymptom", name: "Palpitations" },
    answer: "A racing or pounding heartbeat at night is often noticed simply because it's quiet and you're lying still, and it is commonly linked to caffeine, alcohol, stress, dehydration or a late meal. Sometimes it comes from a heart rhythm problem, an overactive thyroid, anemia or sleep apnea, so frequent or long episodes should be checked by a doctor.",
    sections: [
      { h: "Common, usually harmless causes", list: ["Lying on your left side, which makes your heartbeat easier to feel", "Caffeine, energy drinks, nicotine or alcohol in the evening", "Stress, anxiety or a vivid dream", "Dehydration, a heavy late meal or a fever", "Some medicines and decongestants"] },
      { h: "Causes a doctor should look for", list: ["Heart rhythm problems such as atrial fibrillation (AFib) or supraventricular tachycardia (SVT)", "An overactive thyroid", "Low iron or anemia", "Sleep apnea (pauses in breathing during sleep)", "Low blood sugar"] },
      { h: "How it's checked", p: ["An ECG records your heart rhythm in a few minutes. Because night-time episodes come and go, a Holter monitor that records every heartbeat for 24–72 hours is often used. Blood tests can check thyroid, iron and blood sugar."] },
    ],
    urgent: CALL_911 + " Also call if your heart is racing with a feeling you might pass out.",
    seeDoctor: ["Episodes happen often or last more than a few minutes", "The beat feels irregular, not just fast", "You also feel dizzy, short of breath or very tired", "You have heart disease or a family history of sudden heart problems"],
    links: [L.holterLanding, L.monitoring, L.cardiology, L.symptoms],
    faq: [
      { q: "Is it normal to feel my heartbeat when lying down?", a: "Yes. Many people notice their heartbeat at night, especially on their left side. It's worth checking if it is fast, irregular or comes with other symptoms." },
      { q: "Can anxiety make my heart race at night?", a: "Yes, stress and anxiety can raise your heart rate. A doctor may still check your rhythm, thyroid and iron to rule out other causes." },
      { q: "What test shows what my heart does at night?", a: "A Holter monitor records every heartbeat for 24–72 hours, including while you sleep. NEYU Health offers Holter monitoring in Calgary." },
    ],
  },
  {
    slug: "is-140-over-90-high-blood-pressure", topic: "Blood pressure",
    q: "Is 140/90 high blood pressure?", title: "Is 140/90 High Blood Pressure?",
    description: "What a 140/90 blood pressure reading means in Canada, how home and clinic readings differ, why one reading isn't a diagnosis and what to do next.",
    about: { type: "MedicalCondition", name: "Hypertension" },
    answer: "Yes. In Canada, an average blood pressure of 140/90 or higher measured at a clinic is considered high, and at home the threshold is lower: an average of 135/85 or higher. One reading isn't a diagnosis, so the next step is to repeat measurements, ideally at home or with a 24-hour monitor.",
    sections: [
      { h: "Why one reading isn't enough", p: ["Blood pressure changes through the day with activity, stress, caffeine and even the visit itself (\"white coat\" effect). Doctors look at the average of several readings on different days."] },
      { h: "How to confirm it", list: ["Home readings: morning and evening for 7 days with a validated upper-arm cuff", "24-hour ambulatory blood pressure monitoring, which measures you through a normal day and night", "Repeat clinic readings"] },
      { h: "What happens next", p: ["If your blood pressure is high, your doctor looks at your overall heart risk, may order blood and urine tests, and talks about lifestyle changes and, if needed, medicine. Many people manage it well with regular home readings and follow-up."] },
    ],
    urgent: "Call 911 if your blood pressure is very high (around 180/110 or higher) and you have chest pain, shortness of breath, severe headache, confusion, weakness, or trouble seeing or speaking.",
    seeDoctor: ["Your average is 135/85 or higher at home, or 140/90 or higher at a clinic", "You have diabetes or kidney disease (targets are lower)", "Your readings keep rising"],
    links: [L.htn, L.monitoring, L.cardiology, L.internal],
    faq: [
      { q: "Is 140/90 an emergency?", a: "Not by itself. It's high and should be confirmed and followed up, but it isn't an emergency unless you have symptoms like chest pain, severe headache or trouble breathing." },
      { q: "Why is the home threshold lower?", a: "Readings at home are usually lower than at a clinic, so Canadian guidance uses 135/85 for home averages and 140/90 for clinic readings." },
      { q: "Can I manage high blood pressure without visiting a clinic?", a: "Often, yes. NEYU's Virtual Hypertension Clinic lets patients in Alberta send home readings and get regular physician review." },
    ],
  },
  {
    slug: "what-is-normal-blood-pressure", topic: "Blood pressure",
    q: "What is a normal blood pressure?", title: "What Is a Normal Blood Pressure?",
    description: "What counts as normal blood pressure for adults, what the top and bottom numbers mean, and when readings are considered high in Canada.",
    about: { type: "MedicalCondition", name: "Hypertension" },
    answer: "For most adults, a blood pressure under 120/80 is considered normal. Readings between about 120–139 over 80–89 are above ideal and worth watching, and in Canada an average of 140/90 or higher at a clinic, or 135/85 or higher at home, is considered high.",
    sections: [
      { h: "What the two numbers mean", list: ["Top number (systolic): the pressure when your heart beats", "Bottom number (diastolic): the pressure when your heart rests between beats"] },
      { h: "What raises it", list: ["Salt, alcohol and processed food", "Low activity and extra weight", "Stress and poor sleep, including sleep apnea", "Some medicines, such as anti-inflammatories and decongestants", "Family history and age"] },
      { h: "Low blood pressure", p: ["Low readings are usually fine if you feel well. Low blood pressure with dizziness, fainting or confusion should be checked."] },
    ],
    seeDoctor: ["Your readings are often above 135/85 at home", "Your readings are rising over time", "You feel dizzy or faint when you stand up"],
    links: [L.htn, L.monitoring, L.myHealth],
    faq: [
      { q: "Is 130/85 normal?", a: "It's above the ideal range but below the level usually called high. It's a good reason to check regularly and look at diet, activity and sleep." },
      { q: "Does normal blood pressure change with age?", a: "Blood pressure tends to rise with age, but the same thresholds are used to decide when it's high. Your doctor may set a personal target." },
      { q: "How often should I check my blood pressure?", a: "Adults should have it checked at least once a year, more often if it's high or if you have diabetes, kidney or heart disease." },
    ],
  },
  {
    slug: "chest-pain-when-to-worry", topic: "Heart",
    q: "Chest pain: when should I worry?", title: "Chest Pain: When Should You Worry?",
    description: "Which kinds of chest pain need 911 now, common heart and non-heart causes, and what tests a cardiologist may use to find the cause.",
    about: { type: "MedicalSignOrSymptom", name: "Chest pain" },
    answer: "Call 911 for chest pain or pressure that is new, lasts more than a few minutes, or comes with shortness of breath, sweating, nausea, or pain spreading to the arm, jaw or back. Chest pain also has many non-heart causes, such as muscle strain, reflux or anxiety, but only a medical assessment can tell them apart.",
    sections: [
      { h: "Warning signs of a heart problem", list: ["Pressure, squeezing, heaviness or tightness", "Pain spreading to the arm, shoulder, neck, jaw or back", "Shortness of breath, cold sweat, nausea or light-headedness", "Pain that starts with exertion and eases with rest"] },
      { h: "Other common causes", list: ["Muscle or rib strain (often hurts when you press on it or move)", "Acid reflux (burning, related to meals or lying down)", "Anxiety or panic attacks", "Lung problems such as infection or a blood clot"] },
      { h: "How the cause is found", p: ["Doctors use an ECG, blood tests and often an echocardiogram or a stress test to see how the heart works under exertion. NEYU Health runs Alberta's first onsite exercise stress echocardiogram program."] },
    ],
    urgent: CALL_911 + " Women, older adults and people with diabetes may have less typical symptoms, such as unusual tiredness or shortness of breath.",
    seeDoctor: ["Chest discomfort that comes with exercise and goes away with rest", "Repeated chest pain, even if mild", "Chest pain plus risk factors such as high blood pressure, high cholesterol, diabetes, smoking or family history"],
    links: [L.symptoms, L.stress, L.cardiology, L.imaging],
    faq: [
      { q: "Should I go to the ER or wait for an appointment?", a: "If the pain is new, severe, lasting, or comes with shortness of breath, sweating or nausea, call 911. Book an appointment only for mild, recurring discomfort that has already been checked as non-urgent." },
      { q: "Can anxiety cause chest pain?", a: "Yes, but heart causes need to be ruled out first, especially if it's the first time." },
      { q: "What tests check for heart-related chest pain?", a: "An ECG, blood tests, an echocardiogram and a stress test such as a stress echocardiogram." },
    ],
  },
  {
    slug: "shortness-of-breath-when-walking", topic: "Heart",
    q: "Why do I get short of breath when walking?", title: "Short of Breath When Walking: Causes",
    description: "Why you might get out of breath walking or climbing stairs, from fitness and weight to heart, lung and blood causes, and which tests can find the reason.",
    about: { type: "MedicalSignOrSymptom", name: "Dyspnea" },
    answer: "Getting out of breath when walking is often due to low fitness or extra weight, but it can also be caused by lung conditions like asthma or COPD, anemia, or heart problems such as heart failure or a valve problem. If it's new, getting worse, or happens with less effort than before, see a doctor.",
    sections: [
      { h: "Possible causes", list: ["Low fitness or extra weight", "Asthma or COPD", "Anemia (low iron or hemoglobin)", "Heart failure, heart valve disease or a heart rhythm problem", "Blood clots in the lungs (sudden and severe; an emergency)", "Anxiety"] },
      { h: "Tests that help", list: ["Pulmonary function testing to measure how your lungs move air", "An echocardiogram to look at your heart's pumping and valves", "A stress test to see how your heart responds to exercise", "Blood tests, including hemoglobin"] },
    ],
    urgent: "Call 911 if shortness of breath is sudden or severe, or comes with chest pain, fainting, coughing up blood, or blue lips.",
    seeDoctor: ["It's new or getting worse", "You get breathless with less effort than before", "You also have swollen ankles, need extra pillows to sleep, or wake up breathless", "You have a cough or wheeze that doesn't go away"],
    links: [L.pulmonary, L.imaging, L.stress, L.heartFailure],
    faq: [
      { q: "Is shortness of breath when walking a heart problem?", a: "It can be, but lungs, blood and fitness are common causes too. A doctor can sort it out with a few tests." },
      { q: "Which test checks my lungs?", a: "Pulmonary function testing. In Calgary, NEYU offers it with the Advanced Respiratory Care Network." },
      { q: "Which test checks my heart?", a: "An echocardiogram shows how well your heart pumps and how the valves work; a stress test shows how it handles exercise." },
    ],
  },
  {
    slug: "heart-skipping-a-beat", topic: "Heart",
    q: "Why does my heart skip a beat?", title: "Why Does My Heart Skip a Beat?",
    description: "What it means when your heart skips, flutters or thumps, why extra beats are common, what triggers them and when to have your heart rhythm checked.",
    about: { type: "MedicalSignOrSymptom", name: "Palpitations" },
    answer: "A skipped or fluttering beat is usually an extra beat (a premature atrial or ventricular contraction), which is very common and often harmless. They can be triggered by caffeine, alcohol, stress or poor sleep, but frequent extra beats, or beats with dizziness or fainting, should be checked with an ECG or Holter monitor.",
    sections: [
      { h: "Why it feels like a skip", p: ["An early beat comes before your heart has filled, so it's weak. The pause after it, and the stronger beat that follows, feel like a skip or a thump."] },
      { h: "Common triggers", list: ["Caffeine, alcohol, nicotine and energy drinks", "Stress, anxiety and poor sleep", "Dehydration and low potassium or magnesium", "Some medicines and decongestants"] },
      { h: "When it needs more checking", p: ["If extra beats are very frequent, happen in runs, or you have heart disease, your doctor may order a Holter monitor and an echocardiogram to check your heart structure."] },
    ],
    urgent: "Call 911 if a skipped or fast heartbeat comes with chest pain, fainting, or severe shortness of breath.",
    seeDoctor: ["Skipped beats happen many times a day", "You feel dizzy or light-headed with them", "You have heart disease or a family history of sudden death"],
    links: [L.holterLanding, L.imaging, L.cardiology, L.symptoms],
    faq: [
      { q: "Are skipped heartbeats dangerous?", a: "Most are harmless, especially in people with healthy hearts. Frequent beats or beats with other symptoms should be checked." },
      { q: "Can coffee cause skipped beats?", a: "It can in some people. Cutting back on caffeine and alcohol is a common first step." },
      { q: "How do doctors find skipped beats?", a: "An ECG catches them if they happen during the test; a Holter monitor records every beat for 24–72 hours." },
    ],
  },
  {
    slug: "dizzy-when-standing-up", topic: "Blood pressure",
    q: "Why do I feel dizzy when I stand up?", title: "Why Do I Feel Dizzy When I Stand Up?",
    description: "Why standing up can make you dizzy or light-headed, including low blood pressure on standing, dehydration and medicines, and when it needs a doctor.",
    about: { type: "MedicalCondition", name: "Orthostatic hypotension" },
    answer: "Feeling dizzy when you stand up is often caused by a temporary drop in blood pressure (orthostatic hypotension), which is commonly linked to dehydration, some blood pressure or prostate medicines, or standing up too quickly. If it happens often, makes you fall or faint, or comes with chest pain or palpitations, see a doctor.",
    sections: [
      { h: "What's happening", p: ["When you stand, blood pools in your legs and your body normally tightens blood vessels and speeds your heart within seconds. If that response is slow, blood pressure drops and your brain briefly gets less blood. Doctors often define it as a drop of 20 points in the top number or 10 in the bottom number within 3 minutes of standing."] },
      { h: "Common causes", list: ["Dehydration, heat or alcohol", "Blood pressure, heart, prostate or mood medicines", "Long bed rest or illness", "Heart rhythm or heart valve problems", "Nerve conditions, such as those linked to diabetes or Parkinson's"] },
      { h: "Simple steps", list: ["Sit on the edge of the bed for a moment before standing", "Drink enough fluids, especially in heat", "Ask your doctor or pharmacist to review your medicines"] },
    ],
    urgent: "Call 911 if you faint and have chest pain, palpitations, shortness of breath, or weakness on one side.",
    seeDoctor: ["It happens often", "You have fallen or fainted", "It started after a new medicine"],
    links: [L.monitoring, L.internal, L.cardiology],
    faq: [
      { q: "Is feeling dizzy when standing up normal?", a: "A brief, occasional head rush can be normal. Frequent dizziness, falls or fainting are not and should be checked." },
      { q: "Can blood pressure pills make me dizzy?", a: "Yes. Some can lower blood pressure too much on standing. Don't stop them on your own; ask your doctor." },
      { q: "What test checks this?", a: "Your doctor can measure blood pressure lying and standing. A 24-hour blood pressure monitor or a Holter monitor may also help." },
    ],
  },
  {
    slug: "swollen-ankles-and-feet", topic: "Heart",
    q: "What causes swollen ankles and feet?", title: "Swollen Ankles and Feet: Causes",
    description: "Common reasons for swollen ankles and feet, when swelling can point to a heart, vein, kidney or liver problem, and when one swollen leg is an emergency.",
    about: { type: "MedicalSignOrSymptom", name: "Edema" },
    answer: "Swollen ankles and feet are commonly caused by standing or sitting for long periods, heat, salty food or some medicines, such as certain blood pressure pills. Swelling in both legs can also be a sign of heart failure, vein problems, or kidney or liver disease, and swelling in one leg with pain or redness can be a blood clot that needs urgent care.",
    sections: [
      { h: "Everyday causes", list: ["Long periods of standing, sitting or travel", "Hot weather", "Salty food", "Pregnancy", "Medicines such as amlodipine, anti-inflammatories and steroids"] },
      { h: "Medical causes", list: ["Heart failure (often with shortness of breath or needing more pillows at night)", "Vein problems (varicose veins, venous insufficiency)", "Kidney or liver disease", "Low thyroid"] },
      { h: "Tests that help", p: ["An echocardiogram checks heart pumping and valves. Blood and urine tests check kidneys and liver. Ultrasound can check leg veins."] },
    ],
    urgent: "Get urgent care for one swollen, painful, red or warm leg (possible blood clot), and call 911 if swelling comes with sudden shortness of breath or chest pain.",
    seeDoctor: ["Swelling doesn't go down overnight", "You're also short of breath or tired", "You've gained weight quickly over a few days"],
    links: [L.heartFailure, L.imaging, L.cardiology],
    faq: [
      { q: "Can swollen ankles be a heart problem?", a: "Yes. Heart failure can cause fluid to build up in the legs, often with shortness of breath. An echocardiogram helps check." },
      { q: "When is a swollen leg an emergency?", a: "When only one leg is swollen and it's painful, red or warm, or when swelling comes with sudden shortness of breath or chest pain." },
      { q: "What helps everyday ankle swelling?", a: "Raising your legs, moving regularly, less salt and compression stockings can help. Ask your doctor before starting compression if you have heart or circulation problems." },
    ],
  },
  {
    slug: "what-do-cholesterol-numbers-mean", topic: "Tests",
    q: "What do my cholesterol numbers mean?", title: "What Do My Cholesterol Numbers Mean?",
    description: "A plain-language guide to LDL, HDL, triglycerides, non-HDL, ApoB and Lp(a) on your cholesterol test, and why your target depends on your overall heart risk.",
    about: { type: "MedicalTest", name: "Lipid panel" },
    answer: "A cholesterol test (lipid panel) shows LDL (\"bad\" cholesterol), HDL (\"good\" cholesterol), triglycerides and often non-HDL cholesterol, and sometimes ApoB or Lp(a). There's no single \"good\" number for everyone: your target depends on your overall risk of heart disease, which your doctor works out from your age, blood pressure, diabetes, smoking and family history.",
    sections: [
      { h: "What each number means", list: ["LDL: carries cholesterol into artery walls; lower is generally better", "HDL: helps remove cholesterol", "Triglycerides: fats in the blood, affected by food, alcohol and blood sugar", "Non-HDL: all the \"bad\" cholesterol together (total minus HDL)", "ApoB: counts the particles that carry \"bad\" cholesterol", "Lp(a): mostly inherited; Canadian guidance suggests checking it once in your life"] },
      { h: "Why high cholesterol has no symptoms", p: ["Cholesterol builds up quietly in the arteries for years. That's why testing matters, especially with high blood pressure, diabetes, smoking or a family history of early heart disease."] },
      { h: "What you can do", list: ["Eat more fibre, vegetables, legumes and unsaturated fats", "Be active most days", "Stop smoking and limit alcohol", "Ask whether medicine is right for your level of risk"] },
    ],
    seeDoctor: ["Your LDL or non-HDL is high", "You have a family history of early heart disease or very high cholesterol", "You've never had Lp(a) measured"],
    links: [L.labs, L.cardiology, L.vascular, L.atHome],
    faq: [
      { q: "Is high cholesterol dangerous if I feel fine?", a: "It can still raise the risk of heart attack and stroke over time, which is why it's tested even without symptoms." },
      { q: "What is ApoB?", a: "A blood test that counts the particles that carry \"bad\" cholesterol. It can be more precise than LDL for some people." },
      { q: "Do I need to fast for a cholesterol test?", a: "Often not. Your doctor or the lab will tell you if your test needs fasting." },
    ],
  },
  {
    slug: "what-is-an-echocardiogram", topic: "Tests",
    q: "What is an echocardiogram?", title: "What Is an Echocardiogram?",
    description: "What an echocardiogram (heart ultrasound) shows, how long it takes, how to prepare and why your doctor may order one, with echo testing in Calgary.",
    about: { type: "MedicalTest", name: "Echocardiogram" },
    answer: "An echocardiogram (\"echo\") is an ultrasound of your heart. It shows the size and thickness of your heart, how well it pumps (ejection fraction) and how the valves work, with no radiation and no needles. At NEYU Health it takes about 30–45 minutes and needs no special preparation.",
    sections: [
      { h: "Why it's ordered", list: ["Shortness of breath, swelling or tiredness", "A heart murmur", "High blood pressure, to check for heart thickening", "After a heart attack or to follow heart failure or valve disease"] },
      { h: "What to expect", list: ["You lie on your side on an exam bed", "Gel and a small probe are moved over your chest", "Wear comfortable, two-piece clothing", "Keep taking your regular medicines"] },
      { h: "Stress echo", p: ["A stress echocardiogram takes pictures before and right after exercise to see how your heart works under effort. NEYU Health runs Alberta's first onsite exercise stress echo program."] },
    ],
    seeDoctor: ["Your doctor hears a murmur", "You have unexplained shortness of breath or swelling"],
    links: [L.imaging, L.stress, L.cardiology, L.referral],
    faq: [
      { q: "Does an echocardiogram hurt?", a: "No. You may feel light pressure from the probe. There are no needles and no radiation." },
      { q: "How long does an echocardiogram take?", a: "About 30–45 minutes at NEYU Health in Calgary." },
      { q: "Do I need a referral?", a: "Most diagnostic tests need a referral or order from a physician. New patients start with a consultation." },
    ],
  },
  {
    slug: "what-does-a-holter-monitor-show", topic: "Tests",
    q: "What does a Holter monitor show?", title: "What Does a Holter Monitor Show?",
    description: "What a Holter monitor records, how long you wear it, how to prepare and which heart rhythm problems it can find, with Holter monitoring in Calgary.",
    about: { type: "MedicalTest", name: "Holter monitor" },
    answer: "A Holter monitor is a small, portable ECG that records every heartbeat for 24–72 hours while you go about your day and sleep. It shows irregular rhythms, pauses, extra beats and episodes of fast or slow heart rate, and your symptom diary lets the doctor match how you felt with what your heart was doing.",
    sections: [
      { h: "What it can find", list: ["Atrial fibrillation and other irregular rhythms", "Extra beats (premature contractions)", "Fast rhythms such as SVT", "Slow heart rate or pauses", "Whether palpitations or dizziness match a rhythm change"] },
      { h: "How to prepare", list: ["Shower before your appointment, because you can't bathe with the device on", "Keep a diary of symptoms and activities", "Avoid strong magnets and metal detectors while wearing it"] },
    ],
    seeDoctor: ["You have palpitations, skipped beats, dizziness or fainting spells"],
    links: [L.holterLanding, L.monitoring, L.cardiology],
    faq: [
      { q: "How long do you wear a Holter monitor?", a: "Usually 24–72 hours, worn continuously." },
      { q: "Can I shower with a Holter monitor?", a: "No. Shower before your appointment; the device must stay dry." },
      { q: "Does a Holter monitor show a heart attack?", a: "It isn't the test for a heart attack. It records heart rhythm. Chest pain needs urgent assessment; call 911 if it's severe or lasting." },
    ],
  },
  {
    slug: "what-is-a-stress-echo", topic: "Tests",
    q: "What is a stress echocardiogram?", title: "What Is a Stress Echocardiogram?",
    description: "How a stress echocardiogram works, what it shows about blood flow to the heart, how long it takes and how to prepare, at NEYU Health in Calgary.",
    about: { type: "MedicalTest", name: "Stress echocardiography" },
    answer: "A stress echocardiogram is a heart ultrasound done before and right after exercise on a treadmill. It shows whether parts of the heart muscle get enough blood when the heart works hard, which helps find coronary artery disease and measure exercise capacity. It takes about 45–60 minutes.",
    sections: [
      { h: "Why it's used", list: ["Chest discomfort or shortness of breath with exertion", "To check for blocked heart arteries", "Before starting an exercise program, when advised", "To follow known heart disease"] },
      { h: "How to prepare", list: ["Wear comfortable clothing and running shoes", "No food or caffeine for 4 hours before", "No creams or lotions on your chest that day", "Ask your doctor about your regular medicines"] },
      { h: "At NEYU Health", p: ["NEYU Health runs Alberta's first onsite exercise stress echocardiogram program in Calgary."] },
    ],
    seeDoctor: ["You get chest discomfort or unusual breathlessness with exercise"],
    links: [L.stress, L.imaging, L.cardiology, L.referral],
    faq: [
      { q: "How long does a stress echo take?", a: "About 45–60 minutes at NEYU Health." },
      { q: "Is a stress echo safe?", a: "It's a common, closely supervised test. The team watches your ECG and blood pressure the whole time." },
      { q: "Can I eat before a stress echo?", a: "No food or caffeine for 4 hours before the test." },
    ],
  },
  {
    slug: "what-does-a-dna-test-tell-you", topic: "Genetics & longevity",
    q: "What can a DNA test tell me about my health?", title: "What Can a DNA Test Tell You?",
    description: "What medical DNA tests like whole genome and exome sequencing can and can't tell you, from inherited risk to medicine response, and how results are reviewed.",
    about: { type: "MedicalTest", name: "Genetic testing" },
    answer: "A medical DNA test can show inherited variants that raise the risk of certain conditions, genes that affect how you respond to medicines (pharmacogenomics), and carrier status for some inherited conditions. It can't predict your future with certainty: most conditions also depend on lifestyle and environment, so results should be reviewed with a physician.",
    sections: [
      { h: "Types of DNA tests", list: ["Whole genome sequencing: reads almost all of your DNA", "Whole exome sequencing: reads the protein-coding parts, where most known disease variants are", "Pharmacogenomics: genes that affect how you process medicines", "Targeted tests: one condition or gene panel"] },
      { h: "What it can't do", list: ["Tell you for certain that you will or won't get a disease", "Replace regular check-ups and screening", "Always give a clear answer: some variants are of uncertain significance"] },
      { h: "Before you test", p: ["Think about what you want to learn and how results might affect your family. Review results with a physician or genetic counsellor."] },
    ],
    seeDoctor: ["Strong family history of heart disease, cancer or early death", "Medicines that haven't worked or caused side effects"],
    links: [L.dna, L.genomics, L.bioAge],
    faq: [
      { q: "Is a medical DNA test the same as an ancestry test?", a: "No. Medical tests use clinical-grade sequencing and are reviewed for health meaning; ancestry tests are designed for family history." },
      { q: "How long do DNA test results take?", a: "For BioAro Labs genome and exome sequencing, about 4–6 weeks." },
      { q: "Do I need a prescription?", a: "Some tests, such as pharmacogenomics and disease-based DNA tests, need a prescription. The NEYU team can help." },
    ],
  },
  {
    slug: "what-is-pharmacogenomics", topic: "Genetics & longevity",
    q: "What is pharmacogenomics?", title: "What Is Pharmacogenomics (PGx) Testing?",
    description: "How pharmacogenomic testing shows the way your genes affect medicines like clopidogrel, statins and antidepressants, and why not to change medicines yourself.",
    about: { type: "MedicalTest", name: "Pharmacogenomic testing" },
    answer: "Pharmacogenomics (PGx) testing looks at genes that affect how your body processes certain medicines. It can help explain side effects or poor response and guide the choice and dose of some drugs, such as clopidogrel, certain statins, some antidepressants and codeine. It's a one-time test whose results stay useful for life.",
    sections: [
      { h: "Examples of gene–drug pairs", list: ["CYP2C19: clopidogrel, some antidepressants and acid-reducing medicines", "SLCO1B1: statin-related muscle side effects", "CYP2D6: codeine, tramadol and some antidepressants", "CYP2C9 and VKORC1: warfarin dosing"] },
      { h: "Important", p: ["Never stop, start or change a medicine because of a gene result. Your prescriber decides, using your results together with your health history."] },
    ],
    seeDoctor: ["You take several medicines", "A medicine didn't work or caused side effects", "You're starting a medicine with a known gene interaction"],
    links: [L.dna, L.genomics, L.longevityLab],
    faq: [
      { q: "Is pharmacogenomic testing a one-time test?", a: "Yes. Your genes don't change, so results can guide medicines for the rest of your life." },
      { q: "Do I need a prescription for PGx testing?", a: "Yes, the BioAro Labs pharmacogenomics test requires a prescription." },
      { q: "Will PGx testing tell me which medicine to take?", a: "It gives your prescriber extra information. The decision always considers your whole health picture." },
    ],
  },
  {
    slug: "what-is-biological-age", topic: "Genetics & longevity",
    q: "What is biological age?", title: "What Is Biological Age and Can You Test It?",
    description: "The difference between biological and chronological age, how markers like inflammation and telomeres relate to aging, and what tests can and can't measure.",
    about: { type: "MedicalCondition", name: "Aging" },
    answer: "Biological age is an estimate of how your body is aging, compared with your age in years. It's estimated from markers such as inflammation, cellular stress, telomere length, blood pressure and fitness, and research tools called epigenetic clocks. It can change with sleep, activity, diet and not smoking, but tests are estimates, not a diagnosis.",
    sections: [
      { h: "Markers linked to aging", list: ["Low-grade inflammation (for example hs-CRP and IL-6)", "Cellular stress (GDF-15)", "Telomere length", "Blood pressure, blood sugar and cholesterol", "Fitness, strength and body composition"] },
      { h: "What changes it", list: ["Regular activity and strength training", "Good sleep", "A diet rich in plants and fibre", "Not smoking and limiting alcohol", "Managing blood pressure and blood sugar"] },
      { h: "Keep it in perspective", p: ["Aging tests are best used as a baseline you re-test over time, alongside regular medical care."] },
    ],
    seeDoctor: ["You want a personal plan based on your results"],
    links: [L.bioAge, L.longevityLab, L.exec],
    faq: [
      { q: "Can I lower my biological age?", a: "Studies show markers linked to aging can improve with lifestyle changes. Re-testing helps track your progress." },
      { q: "What test measures biological age?", a: "There's no single test. Panels combine markers such as inflammation, GDF-15 and telomere length; epigenetic clocks are mostly research tools." },
      { q: "Is a biological age test a diagnosis?", a: "No. It's an estimate to guide prevention, reviewed with your clinician." },
    ],
  },
  {
    slug: "what-is-hs-crp", topic: "Tests",
    q: "What does a high hs-CRP mean?", title: "What Does a High hs-CRP Mean?",
    description: "What the high-sensitivity C-reactive protein (hs-CRP) blood test measures, how results relate to heart risk, and why a very high result is usually repeated.",
    about: { type: "MedicalTest", name: "High-sensitivity C-reactive protein" },
    answer: "hs-CRP (high-sensitivity C-reactive protein) is a blood test for low-grade inflammation in the body. Roughly, under 1 mg/L is linked with lower heart risk, 1–3 mg/L with average risk and over 3 mg/L with higher risk. A result over 10 mg/L usually points to an infection or injury, so the test is repeated once you're well.",
    sections: [
      { h: "Why it matters", p: ["Inflammation plays a role in the build-up of plaque in arteries. hs-CRP adds to, but doesn't replace, cholesterol, blood pressure and other risk factors."] },
      { h: "What raises it", list: ["Recent infection, injury or surgery", "Extra weight and inactivity", "Smoking", "Inflammatory conditions such as arthritis", "Poor sleep and stress"] },
    ],
    seeDoctor: ["Your hs-CRP is above 3 mg/L on repeat testing", "You have other heart risk factors"],
    links: [L.labs, L.atHome, L.bioAge, L.cardiology],
    faq: [
      { q: "Is hs-CRP the same as CRP?", a: "It measures the same protein, but the high-sensitivity test detects much lower levels, which is useful for heart risk." },
      { q: "Can I lower my hs-CRP?", a: "Activity, weight loss, not smoking and treating inflammatory conditions can lower it." },
      { q: "Can I do an hs-CRP test at home?", a: "In Calgary, hs-CRP is one of the tests available with NEYU's at-home blood collection." },
    ],
  },
  {
    slug: "why-am-i-always-tired", topic: "Everyday health",
    q: "Why am I always tired?", title: "Why Am I Always Tired? Causes and Tests",
    description: "Common reasons for constant tiredness, from sleep and stress to anemia, thyroid, vitamin D and blood sugar, and the blood tests doctors often check.",
    about: { type: "MedicalSignOrSymptom", name: "Fatigue" },
    answer: "Constant tiredness is most often linked to poor or short sleep, stress, low activity or diet, but it can also come from low iron (anemia), thyroid problems, low vitamin D or B12, high blood sugar, sleep apnea, depression, or heart or lung conditions. If it lasts more than a few weeks, simple blood tests and a check-up can find many of these causes.",
    sections: [
      { h: "Common causes", list: ["Not enough or poor-quality sleep, including sleep apnea", "Stress, anxiety or low mood", "Low iron or anemia", "Underactive thyroid", "Low vitamin D or B12", "High blood sugar or diabetes", "Some medicines", "Heart or lung conditions"] },
      { h: "Tests doctors often check", list: ["Complete blood count and ferritin (iron stores)", "Thyroid (TSH)", "Blood sugar and A1C", "Vitamin B12 and vitamin D", "Kidney and liver function"] },
    ],
    urgent: "Call 911 if tiredness comes with chest pain, severe shortness of breath, fainting or confusion.",
    seeDoctor: ["Tiredness lasts more than 2–3 weeks", "You also have weight loss, fever, night sweats or shortness of breath", "You snore loudly or wake up unrefreshed"],
    links: [L.atHome, L.labs, L.internal, L.respiratory],
    faq: [
      { q: "What blood tests check for tiredness?", a: "Common ones are a blood count, ferritin, thyroid, blood sugar, B12 and vitamin D." },
      { q: "Can sleep apnea make me tired?", a: "Yes. Pauses in breathing at night break up your sleep, even if you don't wake up." },
      { q: "Can I get these tests done at home in Calgary?", a: "Many can be collected at home with NEYU's at-home blood collection; the team confirms which ones when you book." },
    ],
  },
  {
    slug: "snoring-and-sleep-apnea-heart", topic: "Everyday health",
    q: "Can snoring and sleep apnea affect my heart?", title: "Snoring, Sleep Apnea and Your Heart",
    description: "How sleep apnea is linked to high blood pressure, atrial fibrillation and heart failure, the warning signs, and how sleep apnea is tested and treated.",
    about: { type: "MedicalCondition", name: "Obstructive sleep apnea" },
    answer: "Yes. Obstructive sleep apnea, where breathing repeatedly stops during sleep, is linked to high blood pressure, atrial fibrillation, heart failure and stroke. Loud snoring with pauses in breathing, choking or gasping at night, and daytime sleepiness are warning signs; a sleep study can confirm it, and treatment such as CPAP helps.",
    sections: [
      { h: "Warning signs", list: ["Loud snoring, especially with pauses or gasping", "Waking up unrefreshed or with a headache", "Daytime sleepiness or dozing off easily", "High blood pressure that is hard to control", "Waking up often to urinate at night"] },
      { h: "Testing and treatment", p: ["Sleep apnea is diagnosed with a sleep study, at home or in a lab. Treatments include CPAP, oral appliances, weight loss and sleeping position changes. NEYU works with the Advanced Respiratory Care Network for sleep and lung care in Calgary."] },
    ],
    seeDoctor: ["Someone has noticed you stop breathing in your sleep", "You're sleepy during the day, especially while driving", "Your blood pressure is high despite treatment"],
    links: [L.respiratory, L.htn, L.cardiology],
    faq: [
      { q: "Is all snoring sleep apnea?", a: "No. Many people snore without sleep apnea. Pauses in breathing, gasping and daytime sleepiness make apnea more likely." },
      { q: "Can treating sleep apnea lower blood pressure?", a: "Treatment such as CPAP can help lower blood pressure in many people with sleep apnea." },
      { q: "How is sleep apnea tested?", a: "With a sleep study, which can often be done at home." },
    ],
  },
  {
    slug: "prediabetes-a1c-meaning", topic: "Tests",
    q: "What does my A1C mean? Do I have prediabetes?", title: "A1C and Prediabetes: What Your Result Means",
    description: "What the A1C blood test measures, the Canadian ranges for prediabetes and diabetes, and the steps that can bring blood sugar back to normal.",
    about: { type: "MedicalCondition", name: "Prediabetes" },
    answer: "A1C shows your average blood sugar over about the past 3 months. In Canada, an A1C of 6.0–6.4% is in the prediabetes range and 6.5% or higher suggests diabetes, which is confirmed with a repeat test. Prediabetes can often return to normal with weight loss, activity and diet changes.",
    sections: [
      { h: "Canadian ranges (Diabetes Canada)", list: ["A1C below 6.0%: normal range", "A1C 6.0–6.4%: prediabetes", "A1C 6.5% or higher: diabetes (confirmed with a repeat test)", "Fasting blood sugar 6.1–6.9 mmol/L: impaired fasting glucose; 7.0 mmol/L or higher: diabetes"] },
      { h: "What helps", list: ["Losing 5–10% of body weight, if you have extra weight", "About 150 minutes of activity a week", "More fibre, fewer sugary drinks and refined carbs", "Regular re-testing to track progress"] },
    ],
    seeDoctor: ["Your A1C is 6.0% or higher", "You're very thirsty, urinating often or losing weight without trying", "You have a family history of diabetes"],
    links: [L.endo, L.labs, L.atHome, L.internal],
    faq: [
      { q: "Can prediabetes be reversed?", a: "Often, yes. Weight loss, activity and diet changes can bring blood sugar back to the normal range." },
      { q: "How often should I recheck my A1C?", a: "Your doctor will advise; people with prediabetes are often retested about once a year." },
      { q: "Is A1C accurate for everyone?", a: "Some conditions, such as certain anemias, can affect A1C. Your doctor may use a fasting glucose test instead." },
    ],
  },
  {
    slug: "how-to-measure-blood-pressure-at-home", topic: "Blood pressure",
    q: "How do I measure my blood pressure correctly at home?", title: "How to Measure Blood Pressure at Home",
    description: "Step-by-step guide to accurate home blood pressure readings: the right cuff, how to sit, when to measure, how many readings to take and what the average means.",
    about: { type: "MedicalTest", name: "Home blood pressure monitoring" },
    answer: "Use a validated upper-arm cuff, rest quietly for 5 minutes, sit with your back supported, feet flat and arm at heart level, and take two readings morning and evening for 7 days. Ignore the first day and average the rest; in Canada, a home average of 135/85 or higher is considered high.",
    sections: [
      { h: "Step by step", list: ["Use a validated upper-arm cuff that fits your arm (Hypertension Canada lists recommended devices)", "No caffeine, exercise or smoking for 30 minutes before", "Empty your bladder and sit quietly for 5 minutes", "Back supported, feet flat, legs uncrossed, arm resting at heart level", "Cuff on bare skin, about 2–3 cm above the elbow", "Take 2 readings 1 minute apart, morning and evening, for 7 days", "Skip day 1 and average the rest"] },
      { h: "Common mistakes", list: ["Talking or using your phone during the reading", "Cuff too small or over clothing", "Arm hanging down or unsupported", "Only measuring when you feel unwell"] },
    ],
    urgent: "Call 911 if your blood pressure is around 180/110 or higher with chest pain, shortness of breath, severe headache, confusion or weakness.",
    seeDoctor: ["Your home average is 135/85 or higher", "Your readings are very different between arms"],
    links: [L.htn, L.monitoring, L.myHealth],
    faq: [
      { q: "Is a wrist blood pressure monitor accurate?", a: "Upper-arm cuffs are preferred. Wrist monitors are more sensitive to position." },
      { q: "Which arm should I use?", a: "Check both arms the first time and then use the arm with the higher reading." },
      { q: "Where can I keep my readings?", a: "In My Health Space, where Neyu tracks your average over time, and they can be shared with NEYU's Virtual Hypertension Clinic." },
    ],
  },
];

export const haBySlug = (slug: string) => HEALTH_ANSWERS.find((a) => a.slug === slug);
export const HA_TOPICS = ["Heart", "Blood pressure", "Tests", "Genetics & longevity", "Everyday health"] as const;
