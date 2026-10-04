import "./users.css";

export default function UsersLoading() {
  return (
    <section className="users-page" aria-busy="true" aria-label="Cargando usuarios">
      <div className="users-heading">
        <div className="skeleton-heading">
          <span className="skeleton skeleton--eyebrow" />
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--text" />
        </div>
        <span className="skeleton skeleton--counter" />
      </div>
      <div className="skeleton skeleton--toolbar" />
      <div className="users-table-card skeleton-table">
        {Array.from({ length: 7 }, (_, index) => (
          <span className="skeleton skeleton--row" key={index} />
        ))}
      </div>
    </section>
  );
}
