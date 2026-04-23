export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="size-6 rounded bg-bg-surface-2" />
        <div className="h-7 w-40 rounded bg-bg-surface-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-bg-surface" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-bg-surface" />
    </div>
  );
}
