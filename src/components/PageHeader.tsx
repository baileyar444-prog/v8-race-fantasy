export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 sm:mb-6">
      {eyebrow ? <div className="pill mb-3">{eyebrow}</div> : null}
      <h1 className="max-w-4xl text-3xl font-black leading-none tracking-tight sm:text-6xl">{title}</h1>
      {children ? <div className="mt-2 hidden max-w-3xl text-base text-track-muted sm:mt-3 sm:block sm:text-lg">{children}</div> : null}
    </div>
  );
}
