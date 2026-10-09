interface Props { page: number; total: number; pageSize: number; onPage: (page: number) => void; busy?: boolean }

export function Pager({ page, total, pageSize, onPage, busy }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="pager" aria-label="Pagination">
      <button disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}>Previous</button>
      <span aria-live="polite">Page {page} of {pages}</span>
      <button disabled={page >= pages || busy} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}
