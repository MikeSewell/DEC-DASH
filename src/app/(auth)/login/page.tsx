"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type AuthTab = "login" | "register";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "login") {
        await signIn("password", {
          email,
          password,
          flow: "signIn",
        });
      } else {
        await signIn("password", {
          email,
          password,
          name,
          flow: "signUp",
        });
      }
      router.push("/dashboard");
    } catch (err) {
      if (tab === "login") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("Could not create account. The email may already be in use.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Tab switcher */}
      <div className="flex border-b border-border mb-6">
        <button
          type="button"
          onClick={() => {
            setTab("login");
            setError("");
          }}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium text-center transition-colors border-b-2 -mb-px",
            tab === "login"
              ? "text-primary border-primary"
              : "text-muted border-transparent hover:text-foreground"
          )}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("register");
            setError("");
          }}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium text-center transition-colors border-b-2 -mb-px",
            tab === "register"
              ? "text-primary border-primary"
              : "text-muted border-transparent hover:text-foreground"
          )}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === "register" && (
          <Input
            label="Full Name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        )}

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={tab === "login" ? "current-password" : "new-password"}
          error={error || undefined}
        />

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          className="w-full"
        >
          {tab === "login" ? "Log In" : "Create Account"}
        </Button>
      </form>
    </>
  );
}
