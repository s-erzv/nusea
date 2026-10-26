interface ScoreboardProps {
  quests: number;
  published: number;
  assets: number;
  venues: number;
}

const items = [
  { key: "quests", label: "Quest publik", accent: "bg-paper" },
  { key: "published", label: "Terbit", accent: "bg-yellow" },
  { key: "assets", label: "Aset publik", accent: "bg-orange" },
  { key: "venues", label: "Venue", accent: "bg-card" },
] as const;

export function Scoreboard({ quests, published, assets, venues }: ScoreboardProps) {
  const values = { quests, published, assets, venues };
  return (
    <section aria-labelledby="scoreboard-title">
      <h2 id="scoreboard-title" className="sr-only">
        Scoreboard
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item, index) => (
          <div key={item.key} className="pixel-card overflow-hidden">
            <div className={`h-2 border-b-[3px] border-line ${item.accent}`} />
            <div className="p-3">
              <dt className="flex items-center gap-2 text-[16px] leading-tight text-muted">
                <span aria-hidden="true" className="font-pixel text-[7px]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item.label}
              </dt>
              <dd className="mt-2 font-pixel text-[24px] leading-none sm:text-[28px]">
                {values[item.key]}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
