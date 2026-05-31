import { ParsedSchedule, ScheduleBlock } from '../types';
import { parseTimeString, getNowISO } from '../utils/time';

let apiKey = process.env.GEMINI_API_KEY || '';
export function setGeminiApiKey(key: string) { apiKey = key; }

const SYSTEM_PROMPT = `You are a multilingual schedule parser. Accept input in ANY language (English, Arabic, Urdu, French, etc.).

Parse the user's study schedule into JSON.

Rules:
- Understand natural language time expressions in any language
- Split the total time range into sequential 2-hour (120 min) Phase blocks
- After each Phase block, add a mandatory 30-minute Big Break
- Return ONLY valid JSON, no markdown, no explanation
- Use ISO 8601 strings for dates
- Current time is provided; infer AM/PM from context if not specified

Examples of accepted input:
- "I want to study from 3:00 PM to 7:00 PM"
- "أريد أن أدرس من الساعة 3 إلى 7 مساءً"
- "راح أدرس من ٣ إلى ٧ العصر"
- "study block 3pm to 7pm"
- "I wanna study 3 to 7"

Output format:
{
  "phases": [
    {
      "label": "Phase 1",
      "startTime": "ISO string",
      "endTime": "ISO string",
      "duration": 120,
      "type": "phase",
      "phaseIndex": 0
    },
    {
      "label": "Big Break",
      "startTime": "ISO string",
      "endTime": "ISO string",
      "duration": 30,
      "type": "big_break",
      "phaseIndex": 0
    }
  ]
}`;

async function callGemini(input: string): Promise<string> {
  if (apiKey === GEMINI_API_KEY_PLACEHOLDER) {
    throw new Error('Gemini API key not configured. Set it with setGeminiApiKey().');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT}\n\nUser schedule: "${input}"\nCurrent time: ${new Date().toISOString()}` }],
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
  // Replace Arabic numeral digits
  const digitMap: Record<string, string> = {
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4',
    '٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4',
    '۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  };
  let s = input.replace(/[٠-٩۰-۹]/g, (c) => digitMap[c] || c);

  // Replace Arabic word numbers
  const words = s.split(/\s+/);
  const result: string[] = [];
  for (const w of words) {
    const cleaned = w.replace(/[^a-zA-Z\u0600-\u06FF]/g, '');
    const num = arabicWordNums[cleaned];
    result.push(num !== undefined ? String(num) : w);
  }
  s = result.join(' ');

  // Normalize time-of-day markers
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

  // Normalize connectors
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

  // Default 12 → 12PM (noon)
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

    // Only add Big Break between phases, not after the last one
    // Require at least one full study interval (25 min) to fit after the break
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

export async function parseSchedule(input: string): Promise<ParsedSchedule> {
  try {
    const rawResponse = await callGemini(input);
    const jsonStr = tryExtractJSON(rawResponse);
    const data = JSON.parse(jsonStr);
    const phases: ScheduleBlock[] = (data.phases || []).map((p: any, i: number) => ({
      id: p.id || `${p.type}-${i}`,
      label: p.label,
      startTime: p.startTime,
      endTime: p.endTime,
      duration: p.duration,
      type: p.type || 'phase',
      status: 'pending',
      phaseIndex: p.phaseIndex ?? i,
    }));
    return { phases, originalInput: input };
  } catch {
    return fallbackParse(input);
  }
}

export async function processAdjustment(
  command: string,
  currentSchedule: ScheduleBlock[]
): Promise<{ phases: ScheduleBlock[]; message: string }> {
  // Arabic number normalization
  const arabicNumMap: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  let cmd = command.replace(/[٠-٩]/g, (c) => arabicNumMap[c] || c);

  // Extend break — English + Arabic + Urdu
  const extendPatterns = [
    /extend.*?break.*?(\d+)\s*minutes?/i,
    /(\d+)\s*minutes?\s*(?:more|extra|longer)?\s*(?:for\s+)?break/i,
    /(?:مد|زد|طوّل|طول|وسع|وسّع|زيادة)\s*(?:ال)?(?:break|بريك|راحة|استراحة|break)?\s*(?:بـ?|ب)?\s*(\d+)\s*(?:دقيقة|دقائق|minutes?|min)?/i,
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

  // Delay — English + Arabic + Urdu
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
