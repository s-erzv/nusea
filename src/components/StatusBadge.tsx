import {
  STATUS_LABELS,
  STATUS_NUMBERS,
  type ResearchStatus,
} from "../../shared/constants";
import { isPipelineStatus, isTerminalStatus } from "../../shared/status";

export function StatusBadge({ status }: { status: ResearchStatus }) {
  const tone = isTerminalStatus(status)
    ? status === "ditolak" || status === "ditarik"
      ? "danger"
      : "muted"
    : status === "published" || status === "accepted"
      ? "success"
      : "default";
  const number = isPipelineStatus(status) ? STATUS_NUMBERS[status] : null;

  return (
    <span className="pixel-badge" data-tone={tone}>
      {number ? `LV ${number} ` : ""}
      {STATUS_LABELS[status]}
    </span>
  );
}
