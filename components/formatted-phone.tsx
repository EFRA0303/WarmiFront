import { phoneParts } from "@/lib/phone";

export function FormattedPhone({
  value,
  className,
  fallback = "Sin teléfono",
}: {
  value?: string | null;
  className?: string;
  fallback?: string;
}) {
  const phone = phoneParts(value);
  return (
    <span className={className}>
      {phone?.formatted ?? value?.trim() ?? fallback}
    </span>
  );
}
