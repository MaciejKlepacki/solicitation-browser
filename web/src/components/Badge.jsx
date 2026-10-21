export default function Badge({ children, cls = 'border-line text-ink-muted', title }) {
  return (
    <span title={title} className={`label inline-flex items-center border px-1.5 py-[3px] leading-none whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}
