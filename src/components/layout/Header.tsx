"use client";

import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  onMenuToggle: () => void;
  userName?: string;
}

export default function Header({ onMenuToggle, userName = "User" }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between px-4 md:px-6",
        "h-[var(--header-height)] bg-surface/80 backdrop-blur-md border-b border-border"
      )}
    >
      {/* Left side — mobile menu button only */}
      <div className="flex items-center">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-[var(--warm-shadow-sm)]"
          title={userName}
        >
          {getInitials(userName)}
        </div>
      </div>
    </header>
  );
}
