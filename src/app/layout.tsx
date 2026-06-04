import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav }    from "@/components/nav";
import { Footer } from "@/components/footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default:  "Andrew Lass — Sr. SRE & Cloud Security Engineer",
    template: "%s | Andrew Lass",
  },
  description:
    "Personal portfolio of Andrew Lass — Senior SRE and Cloud Security Engineer specializing in AWS, Kubernetes, WAF, and DevSecOps.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://andrewlass.dev", // TODO: update with real domain
    siteName: "Andrew Lass",
    title: "Andrew Lass — Sr. SRE & Cloud Security Engineer",
    description:
      "Senior SRE & Cloud Security Engineer. AWS · Kubernetes · WAF · Terraform.",
    images: [
      {
        url: "https://avatars.githubusercontent.com/u/3820695?v=4",
        width: 460,
        height: 460,
        alt: "Andrew Lass",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Andrew Lass — Sr. SRE & Cloud Security Engineer",
    description: "Senior SRE & Cloud Security Engineer. AWS · Kubernetes · WAF.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
