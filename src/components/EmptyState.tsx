import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  body: string;
  action?: ReactNode;
  titleAs?: "p" | "h1";
}

export function EmptyState({
  title,
  body,
  action,
  titleAs = "p",
}: EmptyStateProps) {
  const Title = titleAs;
  return (
    <div className="pixel-card pixel-corner p-6 text-center">
      <Title className="font-pixel text-[10px] leading-6">{title}</Title>
      <p className="mx-auto mt-3 max-w-xl text-[19px] leading-snug text-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
