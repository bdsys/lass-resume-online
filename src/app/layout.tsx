import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Nav }    from "@/components/nav";
import { Footer } from "@/components/footer";
import { getResume } from "@/lib/resume";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const resume     = getResume();
const titleFull  = `Andrew Lass — ${resume.headline}`;
const ogDesc     = resume.pillars.join(" · ");

export const metadata: Metadata = {
  metadataBase: new URL("https://andrewlass.com"),
  title: {
    default:  titleFull,
    template: "%s | Andrew Lass",
  },
  description:
    `Personal portfolio of Andrew Lass — ${resume.headline} specializing in cloud security, networking, and infrastructure automation.`,
  openGraph: {
    type:     "website",
    locale:   "en_US",
    url:      "https://andrewlass.com",
    siteName: "Andrew Lass",
    title:    titleFull,
    description: ogDesc,
    images: [
      {
        url:    "https://avatars.githubusercontent.com/u/3820695?v=4",
        width:  460,
        height: 460,
        alt:    "Andrew Lass",
      },
    ],
  },
  twitter: {
    card:        "summary",
    title:       titleFull,
    description: ogDesc,
  },
  robots: { index: true, follow: true },
};

// Cloudflare Web Analytics (cookieless). Set NEXT_PUBLIC_CF_BEACON_TOKEN to the
// site token from the Cloudflare dashboard → Web Analytics. No-op when unset.
const cfBeaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

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
        {cfBeaconToken && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={JSON.stringify({ token: cfBeaconToken })}
          />
        )}
      </body>
    </html>
  );
}
