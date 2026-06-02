import { ParsedSchedule, ScheduleBlock } from '../types';
import { parseTimeString, getNowISO } from '../utils/time';
import { generateScheduleBlocks } from '../utils/schedule';
import { GEMINI_API_KEY } from '../config';

const GEMINI_MODEL = 'gemini-flash-lite-latest';

let apiKey = GEMINI_API_KEY;
export function setGeminiApiKey(key: string) { apiKey = key; }

const SYSTEM_PROMPT = `You are a multilingual study assistant. Accept input in ANY language (English, Arabic, Urdu, French, etc.).

Extract the START time and END time from the user's study schedule, and give a friendly suggestion about gym/nap/break based on total study hours today.

Rules:
- Understand natural language time expressions in any language
- Return ONLY valid JSON, no markdown, no explanation
- Output times in 12-hour format with AM/PM (e.g. "1:00 AM", "8:00 PM")
- Infer AM/PM from context like morning/afternoon/evening/مساء/صباح if not specified
- If you see a range like "1 to 8", figure out the correct AM/PM from context
- The current time and total study hours today is provided to help you infer
- Generate a short, friendly suggestion (2 sentences max) suggesting gym / power nap / short break based on how many hours they've studied so far
- Keep the suggestion casual like a friend would say

Examples:
- "I want to study from 3:00 PM to 7:00 PM" → {"startTime": "3:00 PM", "endTime": "7:00 PM", "suggestion": "You've done 2 hours already — a quick gym session could wake you up before diving in!"}
- "أريد أن أدرس من الساعة 3 إلى 7 مساءً" → {"startTime": "3:00 PM", "endTime": "7:00 PM", "suggestion": "درست ساعتين اليوم. شوي تمرين أو غفوة سريعة قبل الدراسة؟"}
- "study 1am to 8pm" → {"startTime": "1:00 AM", "endTime": "8:00 PM", "suggestion": "Long day ahead! Power nap before you start to stay sharp."}
- "study from 1 to 8 in the evening" → {"startTime": "1:00 PM", "endTime": "8:00 PM", "suggestion": "You've been at it for 3 hours. Take a 15-min break first — your brain needs it!"}

Output EXACTLY this format (no extra keys):
{"startTime": "HH:MM AM/PM", "endTime": "HH:MM AM/PM", "suggestion": "..."}`;

async function callGemini(input: string, totalStudiedSeconds?: number): Promise<string> {
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Set it with setGeminiApiKey().');
  }
  const hoursToday = totalStudiedSeconds ? Math.round(totalStudiedSeconds / 360) / 10 : 0;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT}\n\nUser schedule: "${input}"\nCurrent time: ${new Date().toISOString()}\nTotal study hours today: ${hoursToday}h` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

function tryExtractJSON(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) return jsonMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0].trim();
  return text.trim();
}

// Arabic word numbers → digits (dialect inclusive)
const arabicWordNums: Record<string, number> = {
  'واحد':1,'واحدة':1,'وحدة':1,'إحدى':1,
  'اثنين':2,'اثنان':2,'اتنين':2,'تنين':2,'ثنتين':2,
  'ثلاثة':3,'ثلاث':3,'تلاتة':3,'تلات':3,
  'أربعة':4,'اربعة':4,'أربع':4,'اربع':4,
  'خمسة':5,'خمس':5,'خمسه':5,
  'ستة':6,'ست':6,'سته':6,
  'سبعة':7,'سبع':7,
  'ثمانية':8,'ثماني':8,'ثمان':8,'تمانية':8,'تمانه':8,'تمنية':8,'تمانة':8,
  'تسعة':9,'تسع':9,'تسعه':9,
  'عشرة':10,'عشر':10,'عشره':10,
  'أحدعش':11,'احدعش':11,'أحد عشر':11,'احد عشر':11,
  'اثنعش':12,'اثنعشر':12,'اثنى عشر':12,'اثني عشر':12,'اتنعش':12,
  'نص':12,'نصف':12,
};

function normalizeArabicTime(input: string): string {
  const digitMap: Record<string, string> = {
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4',
    '٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4',
    '۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  };
  let s = input.replace(/[٠-٩۰-۹]/g, (c) => digitMap[c] || c);

  const words = s.split(/\s+/);
  const result: string[] = [];
  for (const w of words) {
    const cleaned = w.replace(/[^a-zA-Z\u0600-\u06FF]/g, '');
    const num = arabicWordNums[cleaned];
    result.push(num !== undefined ? String(num) : w);
  }
  s = result.join(' ');

  const tod: [string[], string][] = [
    [['الصبح','صباحا','صباح','صباحاً','الصباح'], ' AM'],
    [['الظهر','ظهراً','ظهر'], ' 12PM'],
    [['العصر','عصراً','عصر','المسا','المساء','مساءً','مساء','مسا','م'], ' PM'],
    [['المغرب','مغرب','الليل','ليلاً','ليل','بالليل'], ' PM'],
  ];
  for (const [words, replacement] of tod) {
    for (const w of words) {
      s = s.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);
    }
  }

  const connectors: [RegExp, string][] = [
    [/من\s+الساعة\s+/gi, 'from '],
    [/من\s+الساعه\s+/gi, 'from '],
    [/الساعة\s+/gi, ''],
    [/الساعه\s+/gi, ''],
    [/\bبدي\s+/gi, ''],
    [/\bأبغى\s+/gi, ''],
    [/\bأريد\s+/gi, ''],
    [/\bأبي\s+/gi, ''],
    [/\bابي\s+/gi, ''],
    [/\bأدرس\s+/gi, 'study '],
    [/\bادرس\s+/gi, 'study '],
    [/\bدراسة\s+/gi, 'study '],
    [/\bمذاكرة\s+/gi, 'study '],
    [/\bإلى\b/gi, ' to '],
    [/\bالى\b/gi, ' to '],
    [/\bالي\b/gi, ' to '],
    [/\bلـ\b/gi, ' to '],
    [/\bلل\b/gi, ' to '],
    [/\bحتى\b/gi, ' to '],
    [/\bالی\b/gi, ' to '],
    [/\bto\b/gi, ' to '],
    [/\buntil\b/gi, ' to '],
    [/\btill\b/gi, ' to '],
  ];
  for (const [pattern, replacement] of connectors) {
    s = s.replace(pattern, replacement);
  }

  return s.replace(/\s+/g, ' ').trim();
}

function fallbackParse(input: string): ParsedSchedule {
  const now = new Date();
  let normalized = normalizeArabicTime(input);

  const timePattern = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*to\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
  const timeMatch = normalized.match(timePattern);

  if (!timeMatch) {
    throw new Error('Could not parse time range. Try: "study from 3:00 PM to 7:00 PM" or "بدي أدرس من 8 الصبح لل 12 الظهر"');
  }

  let startStr = timeMatch[1].trim();
  let endStr = timeMatch[2].trim();

  if (/^12$|^12:00$/.test(startStr) && !startStr.toLowerCase().includes('am') && !startStr.toLowerCase().includes('pm')) startStr = '12PM';
  if (/^12$|^12:00$/.test(endStr) && !endStr.toLowerCase().includes('am') && !endStr.toLowerCase().includes('pm')) endStr = '12PM';

  const rawSh = parseInt(startStr, 10);
  const rawEh = parseInt(endStr, 10);
  if (!startStr.toLowerCase().includes('am') && !startStr.toLowerCase().includes('pm')) {
    startStr = rawSh >= 1 && rawSh <= 11 ? startStr + ' AM' : startStr + ' PM';
  }
  if (!endStr.toLowerCase().includes('am') && !endStr.toLowerCase().includes('pm')) {
    endStr = rawEh >= 1 && rawEh <= 11 ? endStr + ' AM' : endStr + ' PM';
  }

  const start = parseTimeString(startStr);
  const end = parseTimeString(endStr);

  if (!start || !end) {
    throw new Error('Could not parse times. Use clear time formats like "3:00 PM" or "الساعة 3 مساءً".');
  }

  const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (totalMinutes < 120) {
    throw new Error('Minimum study time is 2 hours.');
  }

  const phases: ScheduleBlock[] = [];
  let current = new Date(start);
  let phaseIndex = 0;

  while (current < end) {
    const phaseEnd = new Date(current);
    phaseEnd.setMinutes(phaseEnd.getMinutes() + 120);
    const cappedEnd = phaseEnd > end ? end : phaseEnd;
    const actualDuration = Math.round((cappedEnd.getTime() - current.getTime()) / 60000);

    if (actualDuration <= 0) break;

    phases.push({
      id: `phase-${phaseIndex}`,
      label: `Phase ${phaseIndex + 1}`,
      startTime: current.toISOString(),
      endTime: cappedEnd.toISOString(),
      duration: actualDuration,
      type: 'phase',
      status: 'pending',
      phaseIndex,
    });

    current = new Date(cappedEnd);

    const afterBreak = new Date(current);
    afterBreak.setMinutes(afterBreak.getMinutes() + 30 + 25);
    if (afterBreak <= end) {
      const breakEnd = new Date(current);
      breakEnd.setMinutes(breakEnd.getMinutes() + 30);

      phases.push({
        id: `big-break-${phaseIndex}`,
        label: 'Big Break',
        startTime: current.toISOString(),
        endTime: breakEnd.toISOString(),
        duration: 30,
        type: 'big_break',
        status: 'pending',
        phaseIndex,
      });

      current = breakEnd;
    }
    phaseIndex++;
  }

  return { phases, originalInput: input };
}

export async function parseSchedule(input: string, totalStudiedSeconds?: number): Promise<ParsedSchedule> {
  try {
    const rawResponse = await callGemini(input, totalStudiedSeconds);
    const jsonStr = tryExtractJSON(rawResponse);
    const data = JSON.parse(jsonStr);
    const startKey = Object.keys(data).find(k => /^start/i.test(k));
    const endKey = Object.keys(data).find(k => /^end/i.test(k));
    const suggestion = data.suggestion || data.message || data.advice || null;
    if (!startKey || !endKey) throw new Error('Missing times');
    const startDate = parseTimeString(data[startKey]);
    const endDate = parseTimeString(data[endKey]);
    if (!startDate || !endDate) throw new Error('Could not parse times');
    const phases = generateScheduleBlocks(startDate.toISOString(), endDate.toISOString());
    if (phases.length === 0) throw new Error('No phases generated');
    return { phases, originalInput: input, suggestion };
  } catch {
    return fallbackParse(input);
  }
}

export async function processAdjustment(
  command: string,
  currentSchedule: ScheduleBlock[]
): Promise<{ phases: ScheduleBlock[]; message: string }> {
  const arabicNumMap: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  let cmd = command.replace(/[٠-٩]/g, (c) => arabicNumMap[c] || c);

  const extendPatterns = [
    /extend.*?break.*?(\d+)\s*minutes?/i,
    /(\d+)\s*minutes?\s*(?:more|extra|longer)?\s*(?:for\s+)?break/i,
    /(?:مد|زد|طوّل|طول|وسع|وسّع|زيادة)\s*(?:ال)?(?:break|بريك|راحة|استراحة)?\s*(?:بـ?|ب)?\s*(\d+)\s*(?:دقيقة|دقائق|minutes?|min)?/i,
    /break\s*(?:ko|ميں)?\s*(\d+)\s*(?:minute|min|منٹ)?\s*(?:aur|اور|بادھ)?\s*(?:barhao|بڑھاؤ|بڑھا)?/i,
  ];

  for (const pattern of extendPatterns) {
    const extendMatch = cmd.match(pattern);
    if (extendMatch) {
      const minutes = parseInt(extendMatch[1], 10);
      const activeIndex = currentSchedule.findIndex(b => b.status === 'active');
      const breakIndex = currentSchedule.findIndex(
        (b, i) => i > activeIndex && b.type === 'big_break'
      );
      if (breakIndex === -1) {
        return { phases: currentSchedule, message: 'No upcoming Big Break found to extend.' };
      }
      const updated = [...currentSchedule];
      let offsetAccum = 0;
      for (let i = breakIndex; i < updated.length; i++) {
        if (i === breakIndex) offsetAccum = minutes;
        const s = new Date(updated[i].startTime);
        const e = new Date(updated[i].endTime);
        s.setMinutes(s.getMinutes() + offsetAccum);
        e.setMinutes(e.getMinutes() + offsetAccum);
        updated[i] = { ...updated[i], startTime: s.toISOString(), endTime: e.toISOString() };
      }
      const block = updated[breakIndex];
      const blockEnd = new Date(block.endTime);
      blockEnd.setMinutes(blockEnd.getMinutes() + minutes);
      updated[breakIndex] = { ...block, endTime: blockEnd.toISOString(), duration: block.duration + minutes };
      return { phases: updated, message: `Extended Big Break by ${minutes} minutes.` };
    }
  }

  const delayPatterns = [
    /delay\s+(phase\s+\d+|phase\s+\d+|break).*?(\d+)\s*minutes?/i,
    /(\d+)\s*minutes?\s*(?:delay|later|shift|postpone)\s+(phase\s+\d+|break)/i,
    /(?:أخر|أخّر|اجل|أجّل|تأخير|تأخر)\s*(?:ال)?(?:phase|فيز|مرحلة)\s*(\d+)?\s*(?:بـ?|ب)?\s*(\d+)\s*(?:دقيقة|دقائق|minutes?|min)?/i,
    /(?:phase|فيز|مرحلة)\s*(\d+)?\s*(?:ko|ميں)?\s*(\d+)\s*(?:minute|min|منٹ)?\s*(?:der|دیر)?\s*(?:se|سے)?\s*(?:karo|کرو|شروع)?/i,
  ];

  for (const pattern of delayPatterns) {
    const delayMatch = cmd.match(pattern);
    if (delayMatch) {
      const minutes = parseInt(delayMatch[delayMatch.length - 2] || delayMatch[delayMatch.length - 1], 10);
      const target = delayMatch[1]?.toLowerCase() || '';
      const phaseNum = delayMatch[2] ? parseInt(delayMatch[2], 10) : null;
      const idx = phaseNum !== null
        ? currentSchedule.findIndex(b => b.phaseIndex === phaseNum - 1 && b.type === 'phase')
        : currentSchedule.findIndex(b => b.type === 'phase' && b.phaseIndex > (currentSchedule.findIndex(x => x.status === 'active') >= 0 ? currentSchedule.find(x => x.status === 'active')?.phaseIndex ?? 0 : 0));
      if (idx === -1) {
        return { phases: currentSchedule, message: `Could not find target to delay.` };
      }
      const updated = [...currentSchedule];
      let offsetAccum = 0;
      for (let i = idx; i < updated.length; i++) {
        if (i === idx) offsetAccum = minutes;
        const s = new Date(updated[i].startTime);
        const e = new Date(updated[i].endTime);
        s.setMinutes(s.getMinutes() + offsetAccum);
        e.setMinutes(e.getMinutes() + offsetAccum);
        updated[i] = { ...updated[i], startTime: s.toISOString(), endTime: e.toISOString() };
      }
      return { phases: updated, message: `Delayed by ${minutes} minutes.` };
    }
  }

  return { phases: currentSchedule, message: 'Command not recognized. Try "extend break by 15 minutes", "delay Phase 2 by 10", or "مدد الاستراحة 15 دقيقة".' };
}

const REMINDER_PROMPT = `You are a reminder/alert extractor. Accept input in ANY language.

Extract what the user wants to be reminded about and at what time.

Rules:
- Understand natural language time expressions in any language
- Return ONLY valid JSON, no markdown, no explanation
- If the user says something like "remind me to stretch at 6pm" → extract the action and time
- If the user says something like "add a gym break at 7" → extract that
- If the text is NOT a reminder (e.g. it's a question or random chat), return {"type": "unknown"}
- Output times in 12-hour format with AM/PM
- Infer AM/PM from context

Examples:
- "remind me to stretch at 6:00 PM" → {"type": "reminder", "action": "Time to stretch!", "time": "6:00 PM"}
- "ذكرني أتمرن الساعة 7" → {"type": "reminder", "action": "وقت التمرين!", "time": "7:00 PM"}
- "add a gym break at 8:30" → {"type": "reminder", "action": "Go to the gym!", "time": "8:30 PM"}
- "what is the meaning of life" → {"type": "unknown"}

Output EXACTLY this format:
{"type": "reminder"|"unknown", "action": "...", "time": "..."}`;

export async function extractReminder(input: string): Promise<{ action: string; time: string } | null> {
  try {
    const prompt = `${REMINDER_PROMPT}\n\nUser: "${input}"\nCurrent time: ${new Date().toISOString()}`;
    let raw = await callGemini(prompt);
    const jm = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jm) raw = jm[1];
    const bm = raw.match(/\{[\s\S]*\}/);
    if (!bm) return null;
    const data = JSON.parse(bm[0]);
    if (data.type !== 'reminder') return null;
    const date = parseTimeString(data.time);
    if (!date) return null;
    return { action: data.action, time: date.toISOString() };
  } catch {
    return null;
  }
}
