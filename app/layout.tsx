import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = { title: "PerformIQ – Performance Management", description: "Goals, self-appraisals and manager reviews in one place." };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en"><body className="antialiased">{children}</body></html>
    </ClerkProvider>
  );
}
