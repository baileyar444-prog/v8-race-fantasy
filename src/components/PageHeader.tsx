export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow ? <div className="pill mb-3">{eyebrow}</div> : null}
      <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">{title}</h1>
      {children ? <div className="mt-3 max-w-3xl text-lg text-track-muted">{children}</div> : null}
    </div>
  );
}
