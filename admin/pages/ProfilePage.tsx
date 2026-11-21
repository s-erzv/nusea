import { useEffect, useState } from "react";
import { profileSchema, type Profile } from "../../shared/schemas";
import {
  AVATAR_PRESETS,
  DEFAULT_AVATAR,
  GLASSES_LABELS,
  GLASSES_STYLES,
  parseAvatar,
  serializeAvatar,
  type AvatarConfig,
} from "../../shared/avatar";
import { PixelAvatar } from "../../src/components/PixelAvatar";
import { profileFields } from "../forms/fields";
import { PageHeader, Panel } from "../components/layout";
import { SchemaEditor } from "../components/SchemaEditor";
import type { AdminData, Notify, SaveEntity } from "../lib/types";
import { formatDate, nowIso } from "../lib/helpers";

interface ProfilePageProps {
  data: AdminData;
  saveEntity: SaveEntity;
  notify: Notify;
}

export function ProfilePage({ data, saveEntity, notify }: ProfilePageProps) {
  const [editing, setEditing] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const profile = data.profile;
  const initialAvatar = parseAvatar(profile.avatar);
  const [avatar, setAvatar] = useState<AvatarConfig>(
    initialAvatar.kind === "pixel" ? initialAvatar.config : DEFAULT_AVATAR,
  );
  const [avatarImage, setAvatarImage] = useState(
    initialAvatar.kind === "image" ? initialAvatar.url : "",
  );

  useEffect(() => {
    const parsed = parseAvatar(profile.avatar);
    setAvatar(parsed.kind === "pixel" ? parsed.config : DEFAULT_AVATAR);
    setAvatarImage(parsed.kind === "image" ? parsed.url : "");
  }, [profile.avatar]);

  async function saveAvatar(value: string) {
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      await saveEntity("profile", {
        ...profile,
        avatar: value,
        updatedAt: nowIso(),
      });
      notify("Character updated.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not update character.",
        "error",
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  async function save(value: Profile) {
    const next: Profile = { ...value, id: "profile", updatedAt: nowIso() };
    const backup = await saveEntity("profile", next);
    setEditing(false);
    notify(`Profile saved.${backup ? ` Backup: ${backup}` : ""}`);
  }

  return (
    <div>
      <PageHeader
        kicker="Identity / Profile"
        title="Public profile"
        description="Only a public profile appears on the site. Email and social links can be left empty."
        actions={
          <button
            type="button"
            className="pixel-btn"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? "CLOSE EDITOR" : "EDIT PROFILE"}
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          {editing ? (
            <SchemaEditor
              key={profile.updatedAt}
              title="Profile data"
              initial={profile}
              fields={profileFields()}
              schema={profileSchema}
              onSave={save}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <Panel title="Profile data">
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Name", profile.name],
                  ["Handle", profile.handle],
                  ["Campus", profile.campus || "—"],
                  ["Study program", profile.studyProgram || "—"],
                  ["Location", profile.location || "—"],
                  ["Email", profile.email || "—"],
                  ["Avatar", profile.avatar || "nusea-pixel"],
                  ["Visibility", profile.visibility === "public" ? "Public" : "Private"],
                  ["Scholar", profile.socials.scholar || "—"],
                  ["ORCID", profile.socials.orcid || "—"],
                  ["GitHub", profile.socials.github || "—"],
                  ["Updated", formatDate(profile.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[15px] text-muted">{label}</dt>
                    <dd className="break-words leading-snug">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 border-t-2 border-dashed border-line pt-3">
                <p className="text-[15px] text-muted">Tagline</p>
                <p className="text-[18px] leading-snug">{profile.tagline || "—"}</p>
                <p className="mt-3 text-[15px] text-muted">Bio</p>
                <p className="whitespace-pre-wrap text-[17px] leading-snug">
                  {profile.bio || "—"}
                </p>
              </div>
            </Panel>
          )}
        </div>

        <aside className="space-y-4">
          <Panel title="Card preview">
            <div className="border-[3px] border-line bg-paper p-4">
              <div className="mb-3 flex h-20 w-20 items-center justify-center border-[3px] border-line bg-sky pixel-shadow-sm">
                <span className="font-pixel text-[14px]">N</span>
              </div>
              <p className="font-pixel text-[12px] uppercase leading-4 text-muted">
                {profile.handle}
              </p>
              <p className="mt-1 text-[18px] leading-tight">{profile.name}</p>
              <p className="mt-2 text-[16px] leading-snug text-muted">{profile.tagline}</p>
            </div>
          </Panel>

          <Panel title="Character">
            <div className="mx-auto max-w-[220px]">
              <PixelAvatar value={avatarImage || serializeAvatar(avatar)} />
            </div>

            <p className="mt-3 font-pixel text-[10px] uppercase text-muted">
              Presets
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="admin-mini-btn"
                  data-active={
                    serializeAvatar(avatar) === serializeAvatar(preset.config)
                  }
                  onClick={() => {
                    setAvatar(preset.config);
                    setAvatarImage("");
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <p className="mt-3 font-pixel text-[10px] uppercase text-muted">
              Colors
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  ["hijab", "Hijab"],
                  ["hijabDark", "Hijab shade"],
                  ["shirt", "Shirt"],
                  ["skin", "Skin"],
                  ["accent", "Accent"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-2 border-2 border-line bg-paper px-2 py-1 text-[13px]"
                >
                  <span>{label}</span>
                  <input
                    type="color"
                    value={avatar[key]}
                    onChange={(event) =>
                      setAvatar((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="h-7 w-9 cursor-pointer border border-line bg-transparent p-0"
                    aria-label={label}
                  />
                </label>
              ))}
            </div>

            <p className="mt-3 font-pixel text-[10px] uppercase text-muted">
              Glasses
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {GLASSES_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  className="admin-mini-btn"
                  style={
                    avatar.glasses === style
                      ? { background: "var(--yellow)", color: "#14213D" }
                      : undefined
                  }
                  onClick={() =>
                    setAvatar((current) => ({ ...current, glasses: style }))
                  }
                >
                  {GLASSES_LABELS[style]}
                </button>
              ))}
            </div>

            <p className="mt-3 font-pixel text-[10px] uppercase text-muted">
              Or image URL
            </p>
            <input
              className="pixel-input admin-input mt-1"
              placeholder="https://… (optional)"
              value={avatarImage}
              onChange={(event) => setAvatarImage(event.target.value)}
            />

            <button
              type="button"
              className="pixel-btn mt-3 w-full"
              disabled={avatarBusy}
              onClick={() =>
                void saveAvatar(
                  avatarImage.trim()
                    ? avatarImage.trim()
                    : serializeAvatar(avatar),
                )
              }
            >
              {avatarBusy ? "SAVING…" : "SAVE CHARACTER"}
            </button>
          </Panel>

          <Panel title="Export status">
            {profile.visibility === "public" ? (
              <p className="text-[16px]">
                Profile is <strong>public</strong> and will be exported.
              </p>
            ) : (
              <p className="admin-warning">
                Profile is <strong>private</strong>. The public site will use a fallback.
                Change visibility to public before deploying.
              </p>
            )}
          </Panel>

          <Panel title="Notes">
            <ul className="space-y-2 text-[15px] leading-snug text-muted">
              <li>▸ Default avatar: nusea-pixel.</li>
              <li>▸ Scholar/ORCID/GitHub are only exported when the profile is public.</li>
              <li>▸ Do not put a private campus email in the tagline/bio.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
