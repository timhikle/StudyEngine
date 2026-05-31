import { ScheduleBlock, StudyInterval } from '../types';
import { addMinutes } from './time';

const PHASE_DURATION = 120;
const BIG_BREAK_DURATION = 30;
const STUDY_DURATION = 25;
const SHORT_BREAK_DURATION = 5;
const INTERVALS_PER_PHASE = 4;

export function buildPhaseLabel(index: number): string {
  return `Phase ${index + 1}`;
}

export function generateScheduleBlocks(
  startTime: string,
  endTime: string
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  const start = new Date(startTime);
  const end = new Date(endTime);
  let current = new Date(start);
  let phaseIndex = 0;

  while (current < end) {
    const phaseEnd = new Date(current);
    phaseEnd.setMinutes(phaseEnd.getMinutes() + PHASE_DURATION);

    const adjustedEnd = phaseEnd > end ? end : phaseEnd;
    const actualDuration = Math.round(
      (adjustedEnd.getTime() - current.getTime()) / 60000
    );

    if (actualDuration <= 0) break;

    blocks.push({
      id: `phase-${phaseIndex}`,
      label: buildPhaseLabel(phaseIndex),
      startTime: current.toISOString(),
      endTime: adjustedEnd.toISOString(),
      duration: actualDuration,
      type: 'phase',
      status: 'pending',
      phaseIndex,
    });

    current = new Date(adjustedEnd);

    // Only add Big Break between phases, not after the last one
    // Require at least one full study interval (25 min) to fit after the break
    const afterBreak = new Date(current);
    afterBreak.setMinutes(afterBreak.getMinutes() + BIG_BREAK_DURATION + STUDY_DURATION);
    if (afterBreak <= end) {
      const bigBreakStart = new Date(current);
      const bigBreakEnd = new Date(bigBreakStart);
      bigBreakEnd.setMinutes(bigBreakEnd.getMinutes() + BIG_BREAK_DURATION);

      blocks.push({
        id: `big-break-${phaseIndex}`,
        label: 'Big Break',
        startTime: bigBreakStart.toISOString(),
        endTime: bigBreakEnd.toISOString(),
        duration: BIG_BREAK_DURATION,
        type: 'big_break',
        status: 'pending',
        phaseIndex,
      });

      current = bigBreakEnd;
    }
    phaseIndex++;
  }

  return blocks;
}

export function normalizeSchedule(blocks: ScheduleBlock[]): ScheduleBlock[] {
  const result = [...blocks];
  // Remove any Big Break at the very end
  while (result.length > 0 && result[result.length - 1].type === 'big_break') {
    result.pop();
  }
  // Ensure a Big Break exists between consecutive phases
  const final: ScheduleBlock[] = [];
  for (let i = 0; i < result.length; i++) {
    final.push(result[i]);
    if (
      result[i].type === 'phase' &&
      i + 1 < result.length &&
      result[i + 1].type === 'phase' &&
      result[i + 1].phaseIndex === result[i].phaseIndex + 1
    ) {
      final.push({
        id: `big-break-${result[i].phaseIndex}`,
        label: 'Big Break',
        startTime: result[i].endTime,
        endTime: result[i + 1].startTime,
        duration: BIG_BREAK_DURATION,
        type: 'big_break' as const,
        status: 'pending' as const,
        phaseIndex: result[i].phaseIndex,
      });
    }
  }
  return final;
}

export function generateIntervals(): StudyInterval[] {
  const intervals: StudyInterval[] = [];
  for (let i = 0; i < INTERVALS_PER_PHASE; i++) {
    intervals.push({
      type: 'study',
      duration: STUDY_DURATION,
      elapsed: 0,
      status: 'pending',
    });
    if (i < INTERVALS_PER_PHASE - 1) {
      intervals.push({
        type: 'short_break',
        duration: SHORT_BREAK_DURATION,
        elapsed: 0,
        status: 'pending',
      });
    }
  }
  return intervals;
}

export function slideSchedule(
  blocks: ScheduleBlock[],
  fromIndex: number,
  offsetMinutes: number
): ScheduleBlock[] {
  const updated = [...blocks];
  let cumulativeOffset = 0;

  for (let i = fromIndex; i < updated.length; i++) {
    if (i === fromIndex) {
      cumulativeOffset = offsetMinutes;
    }

    const blockStart = new Date(updated[i].startTime);
    blockStart.setMinutes(blockStart.getMinutes() + cumulativeOffset);

    const blockEnd = new Date(updated[i].endTime);
    blockEnd.setMinutes(blockEnd.getMinutes() + cumulativeOffset);

    updated[i] = {
      ...updated[i],
      startTime: blockStart.toISOString(),
      endTime: blockEnd.toISOString(),
    };
  }

  return updated;
}

export function getCurrentIntervalEndSeconds(intervals: StudyInterval[], index: number): number {
  if (index < 0 || index >= intervals.length) return 0;
  return intervals[index].duration * 60;
}

export { PHASE_DURATION, BIG_BREAK_DURATION, STUDY_DURATION, SHORT_BREAK_DURATION, INTERVALS_PER_PHASE };
