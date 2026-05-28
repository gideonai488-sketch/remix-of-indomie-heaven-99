const AppLoadingSkeleton = () => (
  <div className="flex min-h-screen flex-col bg-background">
    {/* Header skeleton */}
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </header>

    {/* Hero skeleton */}
    <div className="relative w-full bg-gradient-hero">
      <div className="container mx-auto flex min-h-[400px] flex-col justify-end px-4 pb-12 pt-24 md:min-h-[520px]">
        <div className="mb-3 h-6 w-48 animate-pulse rounded bg-muted/20" />
        <div className="mb-3 h-12 w-80 animate-pulse rounded bg-muted/20 md:h-16" />
        <div className="mb-4 flex gap-3">
          <div className="h-5 w-16 animate-pulse rounded bg-muted/20" />
          <div className="h-5 w-24 animate-pulse rounded bg-muted/20" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted/20" />
        </div>
        <div className="mb-6 h-12 w-64 animate-pulse rounded bg-muted/20" />
        <div className="flex gap-3">
          <div className="h-12 w-48 animate-pulse rounded-lg bg-primary/20" />
          <div className="h-12 w-36 animate-pulse rounded-lg bg-muted/20" />
        </div>
        <div className="mt-8 flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-24 animate-pulse rounded-lg bg-muted/20 md:h-20 md:w-32" />
          ))}
        </div>
      </div>
    </div>

    {/* Menu row skeletons */}
    {[1, 2].map((row) => (
      <div key={row} className="mb-10 mt-6">
        <div className="container mx-auto px-4">
          <div className="mb-4 h-7 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex gap-4 overflow-hidden px-4">
          {[1, 2, 3, 4].map((card) => (
            <div key={card} className="min-w-[260px] max-w-[300px] flex-shrink-0 overflow-hidden rounded-xl border border-border bg-card md:min-w-[300px]">
              <div className="aspect-video w-full animate-pulse bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="flex justify-between">
                  <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default AppLoadingSkeleton;
