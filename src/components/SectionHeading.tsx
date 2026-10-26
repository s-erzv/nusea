interface SectionHeadingProps {
  kicker: string;
  title: string;
  description?: string;
  numbered?: string;
  as?: "h1" | "h2";
}

export function SectionHeading({
  kicker,
  title,
  description,
  numbered,
  as = "h2",
}: SectionHeadingProps) {
  const Heading = as;
  return (
    <div className="max-w-3xl">
      <p className="mb-2 inline-flex items-center gap-2 border-2 border-line bg-yellow px-2 py-1 font-pixel text-[12px] uppercase leading-4 text-[#14213D]">
        {numbered ? <span aria-hidden="true">{numbered}</span> : null}
        {kicker}
      </p>
      <Heading className="text-balance text-[22px] leading-[1.6] sm:text-[26px]">{title}</Heading>
      {description ? (
        <p className="mt-3 max-w-2xl text-[19px] leading-snug text-muted">{description}</p>
      ) : null}
    </div>
  );
}
