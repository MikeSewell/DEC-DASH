import type { Metadata } from "next";
import { Nunito, Fraunces } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DEC Dashboard — Dads Evoking Change",
  description:
    "Operations dashboard for Dads Evoking Change nonprofit organization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${nunito.variable} ${fraunces.variable} ${geistMono.variable} antialiased noise-texture`}
        >
          {children}
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
