import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-pixel text-[12px] uppercase leading-4 text-muted">{kicker}</p>
        <h1 className="mt-2 text-[20px] leading-[1.6] sm:text-[24px]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-[18px] leading-snug text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className = "",
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-panel ${className}`}>
      <div className="admin-panel-head">
        <h2 className="text-[14px] leading-6">{title}</h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="border-2 border-dashed border-line bg-paper p-5 text-center text-[18px] text-muted">
      {children}
    </div>
  );
}

export function DangerText({ children }: { children: ReactNode }) {
  return <p className="text-[17px] font-bold text-[var(--danger)]">{children}</p>;
}
