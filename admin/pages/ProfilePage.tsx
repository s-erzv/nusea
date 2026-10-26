import { useState } from "react";
import { profileSchema, type Profile } from "../../shared/schemas";
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
  const profile = data.profile;

  async function save(value: Profile) {
    const next: Profile = { ...value, id: "profile", updatedAt: nowIso() };
    const backup = await saveEntity("profile", next);
    setEditing(false);
    notify(`Profil disimpan.${backup ? ` Backup: ${backup}` : ""}`);
  }

  return (
    <div>
      <PageHeader
        kicker="Identitas / Profil"
        title="Profil publik"
        description="Hanya profil berstatus publik yang muncul di situs. Email dan sosial bisa dikosongkan."
        actions={
          <button
            type="button"
            className="pixel-btn"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? "TUTUP EDITOR" : "EDIT PROFIL"}
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          {editing ? (
            <SchemaEditor
              key={profile.updatedAt}
              title="Data profil"
              initial={profile}
              fields={profileFields()}
              schema={profileSchema}
              onSave={save}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <Panel title="Data profil">
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Nama", profile.name],
                  ["Handle", profile.handle],
                  ["Kampus", profile.campus || "—"],
                  ["Program studi", profile.studyProgram || "—"],
                  ["Lokasi", profile.location || "—"],
                  ["Email", profile.email || "—"],
                  ["Avatar", profile.avatar || "nuza-pixel"],
                  ["Visibilitas", profile.visibility === "public" ? "Publik" : "Privat"],
                  ["Scholar", profile.socials.scholar || "—"],
                  ["ORCID", profile.socials.orcid || "—"],
                  ["GitHub", profile.socials.github || "—"],
                  ["Diperbarui", formatDate(profile.updatedAt)],
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
          <Panel title="Pratinjau kartu">
            <div className="border-[3px] border-line bg-paper p-4">
              <div className="mb-3 flex h-20 w-20 items-center justify-center border-[3px] border-line bg-sky pixel-shadow-sm">
                <span className="font-pixel text-[10px]">NUZA</span>
              </div>
              <p className="font-pixel text-[8px] uppercase leading-4 text-muted">
                {profile.handle}
              </p>
              <p className="mt-1 text-[18px] leading-tight">{profile.name}</p>
              <p className="mt-2 text-[16px] leading-snug text-muted">{profile.tagline}</p>
            </div>
          </Panel>

          <Panel title="Status ekspor">
            {profile.visibility === "public" ? (
              <p className="text-[16px]">
                Profil <strong>publik</strong> dan ikut diekspor.
              </p>
            ) : (
              <p className="admin-warning">
                Profil <strong>privat</strong>. Situs publik akan memakai fallback. Ubah
                visibilitas menjadi publik sebelum deploy.
              </p>
            )}
          </Panel>

          <Panel title="Catatan">
            <ul className="space-y-2 text-[15px] leading-snug text-muted">
              <li>▸ Avatar default: nuza-pixel.</li>
              <li>▸ Scholar/ORCID/GitHub hanya diekspor jika profil publik.</li>
              <li>▸ Jangan menaruh email kampus privat di tagline/bio.</li>
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
