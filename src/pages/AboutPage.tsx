import { assets, items, profile, publishedItems } from "../data";
import { EmptyState } from "../components/EmptyState";
import { PixelAvatar } from "../components/PixelAvatar";
import { SectionHeading } from "../components/SectionHeading";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const socialLabels = {
  scholar: "Google Scholar",
  orcid: "ORCID",
  github: "GitHub",
} as const;

export function AboutPage() {
  useDocumentTitle("About");

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          titleAs="h1"
          title="PROFILE NOT AVAILABLE"
          body="The lab owner has not made this profile public yet."
        />
      </div>
    );
  }

  const socials = Object.entries(profile.socials)
    .filter((entry): entry is [keyof typeof socialLabels, string] =>
      Boolean(entry[1]),
    )
    .map(([key, url]) => ({ key, url, label: socialLabels[key] }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <SectionHeading
        as="h1"
        numbered="04"
        kicker="Profile"
        title="About Nusea"
        description="An independent research practice for digital identity, information systems, and Web3."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="pixel-card-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b-[3px] border-line bg-paper px-3 py-2">
            <span className="font-pixel text-[12px] leading-4">PROFILE</span>
            <span className="text-[16px] text-muted">{profile.handle}</span>
          </div>
          <div className="bg-sky p-4">
            <div className="mx-auto max-w-[240px]">
              <PixelAvatar />
            </div>
          </div>
          <div className="border-t-[3px] border-line bg-card p-4">
            <p className="font-pixel text-[14px] leading-6">{profile.name}</p>
            <p className="mt-2 text-[18px] text-muted">
              {profile.studyProgram || "Program not set"}
            </p>
            <p className="text-[18px] text-muted">{profile.campus || "Campus not set"}</p>
            {profile.location ? (
              <p className="mt-1 text-[17px] text-muted">{profile.location}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          <section className="pixel-card p-5 sm:p-6" aria-labelledby="bio-title">
            <h2 id="bio-title" className="text-[16px]">
              Bio
            </h2>
            <p className="mt-3 text-[19px] leading-relaxed">
              {profile.bio || "No bio yet."}
            </p>
            <p className="mt-4 border-t-2 border-dashed border-line pt-3 text-[18px] text-muted">
              {profile.tagline}
            </p>
          </section>

          <section className="pixel-card p-5 sm:p-6" aria-labelledby="stats-title">
            <h2 id="stats-title" className="text-[16px]">
              Stats
            </h2>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="border-[3px] border-line bg-paper p-2">
                <dd className="font-pixel text-[18px]">{items.length}</dd>
                <dt className="mt-1 text-[16px] text-muted">Research</dt>
              </div>
              <div className="border-[3px] border-line bg-yellow p-2 text-[#14213D]">
                <dd className="font-pixel text-[18px]">{publishedItems.length}</dd>
                <dt className="mt-1 text-[16px]">Published</dt>
              </div>
              <div className="border-[3px] border-line bg-paper p-2">
                <dd className="font-pixel text-[18px]">{assets.length}</dd>
                <dt className="mt-1 text-[16px] text-muted">Assets</dt>
              </div>
            </dl>
          </section>

          <section className="pixel-card p-5 sm:p-6" aria-labelledby="kontak-title">
            <h2 id="kontak-title" className="text-[16px]">
              Contact
            </h2>
            {profile.email || socials.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {profile.email ? (
                  <li>
                    <p className="font-pixel text-[12px] uppercase leading-4 text-muted">
                      Email
                    </p>
                    <a
                      className="pixel-link break-all text-[18px]"
                      href={`mailto:${profile.email}`}
                    >
                      {profile.email}
                    </a>
                  </li>
                ) : null}
                {socials.map((social) => (
                  <li key={social.key}>
                    <p className="font-pixel text-[12px] uppercase leading-4 text-muted">
                      {social.label}
                    </p>
                    <a
                      className="pixel-link break-all text-[18px]"
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {social.url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[18px] text-muted">
                Contact details are not set. Add an email or social link from the back office.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
