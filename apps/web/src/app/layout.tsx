import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Restaurant Menu SaaS",
  description: "QR self-ordering, kitchen and waiter operations, restaurant admin, and super-admin controls in one monorepo MVP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
