"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Spinner from "@/components/ui/Spinner";
import { ToastProvider } from "@/components/ui/Toast";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="h-screen bg-warm-gradient flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userName={currentUser?.name ?? "User"}
          userRole={currentUser?.role ?? "staff"}
          onLogout={handleLogout}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
            userName={currentUser?.name ?? "User"}
          />

          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <DashboardShell>{children}</DashboardShell>
    </ConvexClientProvider>
  );
}
