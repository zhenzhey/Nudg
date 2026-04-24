import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nudg — Ship Weekly. Build Credibility.",
    template: "%s | Nudg",
  },
  description:
    "Turn your vague idea into a structured execution plan with weekly deliverables you actually submit. Built-in AI planning and accountability.",
  keywords: ["side projects", "accountability", "shipping", "builders", "indie hackers"],
  authors: [{ name: "Nudg" }],
  openGraph: {
    title: "Nudg — Ship Weekly. Build Credibility.",
    description:
      "Turn your vague idea into a structured execution plan with weekly deliverables you actually submit.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ECEFFE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
