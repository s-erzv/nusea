import type { FieldDef } from "../components/SchemaForm";
import {
  assetKindOptions,
  grantClusterOptions,
  grantStageOptions,
  ideaScoreFields,
  ideaStatusOptions,
  indexOptions,
  priorityOptions,
  statusOptions,
  typeOptions,
  venueKindOptions,
  verificationOptions,
  visibilityOptions,
} from "../lib/helpers";
import type { AdminData } from "../lib/types";

function idField(isNew: boolean): FieldDef {
  return {
    key: "id",
    label: "ID (slug)",
    type: "text",
    readOnly: !isNew,
    help: isNew
      ? "Lowercase letters, numbers, hyphens. Used in public URLs."
      : "The ID cannot be changed after creation.",
  };
}

const visibilityField: FieldDef = {
  key: "visibility",
  label: "Visibility",
  type: "select",
  options: visibilityOptions,
  help: "Only public items are exported to the public site.",
};

function itemOptions(data: AdminData) {
  return [
    { value: "", label: "— Not linked —" },
    ...data.items
      .map((item) => ({ value: item.id, label: item.title }))
      .sort((a, b) => a.label.localeCompare(b.label, "en")),
  ];
}

export function itemFields(data: AdminData, isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    { key: "title", label: "Title", type: "text", wide: true },
    { key: "type", label: "Type", type: "select", options: typeOptions },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    { key: "stageNote", label: "Stage note", type: "textarea", rows: 3 },
    { key: "abstract", label: "Abstract", type: "textarea", rows: 7 },
    { key: "keywords", label: "Keywords (one per line)", type: "list" },
    { key: "authors", label: "Authors (one per line)", type: "list" },
    { key: "advisors", label: "Advisors (one per line)", type: "list" },
    {
      key: "venueId",
      label: "Venue",
      type: "select",
      options: [
        { value: "", label: "— No venue —" },
        ...data.venues.map((venue) => ({ value: venue.id, label: venue.name })),
      ],
    },
    { key: "submittedAt", label: "Submission date", type: "date" },
    { key: "decisionAt", label: "Decision date", type: "date" },
    { key: "publishedAt", label: "Publication date", type: "date" },
    { key: "doi", label: "DOI", type: "text", placeholder: "10.xxxx/xxxxx" },
    { key: "publicUrl", label: "Public URL", type: "url" },
    { key: "priority", label: "Priority", type: "select", options: priorityOptions },
    {
      key: "progressPct",
      label: "Manual progress (%)",
      type: "number",
      min: 0,
      max: 100,
    },
    { key: "pinned", label: "Pin to research board", type: "checkbox" },
    visibilityField,
    {
      key: "submitChecklist.plagiarismChecked",
      label: "Plagiarism check complete",
      type: "checkbox",
    },
    {
      key: "submitChecklist.finalFileReady",
      label: "Final file ready",
      type: "checkbox",
    },
  ];
}

export function assetFields(data: AdminData, isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    { key: "label", label: "Document label", type: "text", wide: true },
    { key: "kind", label: "Type", type: "select", options: assetKindOptions },
    { key: "url", label: "URL", type: "url" },
    {
      key: "localPath",
      label: "Private local path",
      type: "text",
      help: "Example: assets-private/cropsage/dataset.csv. Not exported.",
    },
    { key: "tags", label: "Tags (one per line)", type: "list" },
    {
      key: "itemIds",
      label: "Link to research",
      type: "checks",
      options: itemOptions(data).slice(1),
    },
    { key: "isPrimary", label: "Primary document", type: "checkbox" },
    { key: "note", label: "Private note", type: "textarea", rows: 3 },
    visibilityField,
  ];
}

export function venueFields(isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    { key: "name", label: "Venue name", type: "text", wide: true },
    { key: "kind", label: "Type", type: "select", options: venueKindOptions },
    {
      key: "indexLevel",
      label: "Index level",
      type: "select",
      options: indexOptions,
    },
    { key: "url", label: "URL", type: "url" },
    {
      key: "typicalReviewWeeks",
      label: "Typical review (weeks)",
      type: "number",
      min: 0,
      max: 520,
    },
    { key: "notes", label: "Private notes", type: "textarea", rows: 3 },
    visibilityField,
  ];
}

export function sourceFields(data: AdminData, isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    {
      key: "itemId",
      label: "Research",
      type: "select",
      options: itemOptions(data).slice(1),
    },
    { key: "citationText", label: "Citation text", type: "textarea", rows: 4 },
    { key: "urlOrDoi", label: "URL or DOI", type: "text", wide: true },
    {
      key: "verificationStatus",
      label: "Verification status",
      type: "select",
      options: verificationOptions,
    },
    { key: "verifiedAt", label: "Verification date", type: "date" },
    { key: "howVerified", label: "How it was verified", type: "textarea", rows: 3 },
    { key: "fileOnHand", label: "Document on hand", type: "checkbox" },
    { key: "notes", label: "Private notes", type: "textarea", rows: 3 },
  ];
}

export function grantFields(data: AdminData, isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    {
      key: "itemId",
      label: "Parent research",
      type: "select",
      options: itemOptions(data),
    },
    { key: "scheme", label: "Scheme", type: "text" },
    { key: "cluster", label: "Cluster", type: "select", options: grantClusterOptions },
    {
      key: "maxFundingIdr",
      label: "Maximum funding (IDR)",
      type: "number",
      min: 0,
      step: 1000000,
    },
    { key: "piName", label: "PI name", type: "text" },
    { key: "team", label: "Team (one per line)", type: "list" },
    { key: "proposalDeadline", label: "Proposal deadline", type: "date" },
    {
      key: "selectionStage",
      label: "Selection stage",
      type: "select",
      options: grantStageOptions,
    },
    { key: "requiredOutputs", label: "Required outputs (one per line)", type: "list" },
    { key: "outputDeadline", label: "Output deadline", type: "date" },
    { key: "editionNote", label: "Edition note", type: "textarea", rows: 3 },
    visibilityField,
  ];
}

export function ideaFields(isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    { key: "title", label: "Idea title", type: "text", wide: true },
    { key: "problem", label: "Problem", type: "textarea", rows: 3 },
    { key: "whyOnChain", label: "Why on-chain", type: "textarea", rows: 3 },
    { key: "cluster", label: "Cluster", type: "select", options: grantClusterOptions },
    { key: "status", label: "Idea status", type: "select", options: ideaStatusOptions },
    ...ideaScoreFields.map<FieldDef>((score) => ({
      key: `scores.${score.key}`,
      label: `${score.label} score (0-10)`,
      type: "number",
      min: 0,
      max: 10,
    })),
    visibilityField,
  ];
}

export function taskFields(data: AdminData, isNew: boolean): FieldDef[] {
  return [
    idField(isNew),
    { key: "title", label: "Task title", type: "text", wide: true },
    { key: "dueAt", label: "Due date", type: "date" },
    { key: "done", label: "Done", type: "checkbox" },
    {
      key: "itemId",
      label: "Related research",
      type: "select",
      options: itemOptions(data),
    },
    { key: "priority", label: "Priority", type: "select", options: priorityOptions },
    { key: "notes", label: "Private notes", type: "textarea", rows: 3 },
  ];
}

export function profileFields(): FieldDef[] {
  return [
    { key: "name", label: "Name", type: "text" },
    { key: "handle", label: "Handle", type: "text" },
    { key: "campus", label: "Campus", type: "text", wide: true },
    { key: "studyProgram", label: "Study program", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "avatar", label: "Avatar", type: "text", help: "Default: nusea-pixel" },
    { key: "email", label: "Public email", type: "text" },
    { key: "tagline", label: "Tagline", type: "text", wide: true },
    { key: "bio", label: "Bio", type: "textarea", rows: 5 },
    { key: "socials.scholar", label: "Google Scholar URL", type: "url" },
    { key: "socials.orcid", label: "ORCID URL", type: "url" },
    { key: "socials.github", label: "GitHub URL", type: "url" },
    visibilityField,
  ];
}
