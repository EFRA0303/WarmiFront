type BrandProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function Brand({ compact = false, inverse = false }: BrandProps) {
  return (
    <div className={`brand ${inverse ? "brand--inverse" : ""}`}>
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img">
          <path d="M24 4C16.7 9.4 9.6 10.2 6 10.4v13.2C6 34 13.4 41.7 24 45c10.6-3.3 18-11 18-21.4V10.4C38.4 10.2 31.3 9.4 24 4Z" />
          <path className="brand__leaf" d="M14.5 27.4c4.2-1.2 7.2-4.1 9.5-9 2.3 4.9 5.3 7.8 9.5 9-2.6 4.7-5.7 7.2-9.5 8.4-3.8-1.2-6.9-3.7-9.5-8.4Z" />
          <path className="brand__spark" d="M24 13v15M16.5 20.5h15" />
        </svg>
      </span>
      {!compact && (
        <span className="brand__copy">
          <strong>Warmi</strong>
          <small>Gestión Spa</small>
        </span>
      )}
    </div>
  );
}
