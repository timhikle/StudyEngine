export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTimeLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function addMinutes(dateString: string, minutes: number): string {
  const date = new Date(dateString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export function parseTimeString(timeStr: string): Date | null {
  const cleaned = timeStr.trim().toLowerCase();
  const patterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/,
    /(\d{1,2})\s*(am|pm)/,
    /(\d{1,2}):(\d{2})/,
  ];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] && match[2].length === 2 && !isNaN(parseInt(match[2], 10))
        ? parseInt(match[2], 10)
        : 0;
      const meridiem = match[3] || (cleaned.includes('am') ? 'am' : cleaned.includes('pm') ? 'pm' : null);
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      if (date < now) {
        date.setDate(date.getDate() + 1);
      }
      return date;
    }
  }
  return null;
}

export function getNowISO(): string {
  return new Date().toISOString();
}
