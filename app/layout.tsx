import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host ?? "localhost:3000"}`);
  const description =
    "An iPad-first German A2 course tracker with daily plans, a 12-week roadmap and local progress saving.";

  return {
    metadataBase,
    title: "German A2 in 12 Weeks",
    description,
    applicationName: "Deutsch A2 Tracker",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Deutsch A2",
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      type: "website",
      title: "German A2 in 12 Weeks",
      description,
      images: [{ url: new URL("/og.png", metadataBase), width: 1731, height: 909 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "German A2 in 12 Weeks",
      description,
      images: [new URL("/og.png", metadataBase)],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#111722" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
