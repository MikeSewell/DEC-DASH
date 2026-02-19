import ConvexClientProvider from "@/components/providers/ConvexClientProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* DEC Branding */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl font-bold text-accent tracking-tight">
                DEC
              </span>
              <span className="text-2xl font-medium text-primary">Dashboard</span>
            </div>
            <p className="text-sm text-muted">Dads Evoking Change</p>
          </div>

          {/* Content card */}
          <div className="bg-surface rounded-xl border border-border shadow-lg p-6">
            {children}
          </div>
        </div>
      </div>
    </ConvexClientProvider>
  );
}
