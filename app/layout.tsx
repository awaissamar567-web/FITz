import "./globals.css";
import { WhopThemeScript, WhopIframeSdkProvider } from "@whop/react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fitz - Fitness Coaching for Whop",
  description: "Manage client check-ins, workout routines, and macro targets inside Whop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID || process.env.WHOP_APP_ID || "app_fitz_dev";

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <WhopThemeScript />
      </head>
      <body className="min-h-screen bg-[#111111] text-zinc-100 antialiased">
        <WhopIframeSdkProvider options={{ appId }}>
          {children}
        </WhopIframeSdkProvider>
      </body>
    </html>
  );
}
