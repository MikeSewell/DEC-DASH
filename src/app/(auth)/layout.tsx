import ConvexClientProvider from "@/components/providers/ConvexClientProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <div className="min-h-screen organic-blob bg-warm-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md relative z-10">
          {/* DEC Branding */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl font-bold text-accent tracking-tight font-[family-name:var(--font-fraunces)]">
                DEC
              </span>
              <span className="text-2xl font-medium text-primary font-[family-name:var(--font-fraunces)]">Dashboard</span>
            </div>
            <p className="text-sm text-muted">Dads Evoking Change</p>
          </div>

          {/* Content card */}
          <div className="bg-surface rounded-2xl border border-border shadow-[var(--warm-shadow-lg)] p-8 animate-scale-in">
            {children}
          </div>
        </div>
      </div>
    </ConvexClientProvider>
  );
}
