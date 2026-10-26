import {
  PIPELINE_STATUSES,
  STATUS_NUMBERS,
  TERMINAL_STATUSES,
  type PipelineStatus,
  type ResearchStatus,
} from "./constants";

export function isPipelineStatus(status: ResearchStatus): status is PipelineStatus {
  return PIPELINE_STATUSES.includes(status as PipelineStatus);
}

export function isTerminalStatus(status: ResearchStatus): boolean {
  return TERMINAL_STATUSES.includes(status as (typeof TERMINAL_STATUSES)[number]);
}

export function statusProgress(status: ResearchStatus, manual = 0): number {
  if (isTerminalStatus(status)) return 100;
  if (isPipelineStatus(status)) {
    const level = STATUS_NUMBERS[status];
    return Math.max(manual, Math.round((level / PIPELINE_STATUSES.length) * 100));
  }
  return manual;
}
