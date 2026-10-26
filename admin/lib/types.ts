import type {
  Asset,
  EntityFile,
  Grant,
  HistoryEntry,
  Idea,
  Profile,
  ResearchItem,
  SourceLog,
  Task,
  Venue,
} from "../../shared/schemas";

export type SaveEntity = (
  entity: EntityFile,
  value: unknown,
) => Promise<string | null>;

export type Notify = (message: string, tone?: "ok" | "error") => void;

export interface AdminData {
  profile: Profile;
  items: ResearchItem[];
  assets: Asset[];
  venues: Venue[];
  sources: SourceLog[];
  grants: Grant[];
  ideas: Idea[];
  tasks: Task[];
  history: HistoryEntry[];
}

export type AdminTab =
  | "dashboard"
  | "items"
  | "kanban"
  | "assets"
  | "sources"
  | "grants"
  | "ideas"
  | "tasks"
  | "venues"
  | "profile"
  | "data"
  | "publish";

export interface BackupEntry {
  name: string;
  size: number;
  modifiedAt: string;
}

export interface CheckLinkResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  message: string;
}

export interface PublishPreview {
  ok: boolean;
  stage: string;
  output: string;
  diff: string;
  status: string;
  stat: string;
  error?: string;
}

export interface PublishActionResult {
  ok: boolean;
  output: string;
  message?: string;
  error?: string;
}
