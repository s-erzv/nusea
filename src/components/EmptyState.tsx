import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="pixel-card pixel-corner p-6 text-center">
      <p className="font-pixel text-[10px] leading-6">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-[19px] leading-snug text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
