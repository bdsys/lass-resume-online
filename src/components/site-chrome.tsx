"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

/**
 * Renders the site chrome (Nav + Footer) around page content — except on
 * immersive routes like /journey, which provide their own "Unplug…" return
 * control instead of the standard toolbar/footer.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = pathname?.startsWith("/journey") ?? false;

  return (
    <>
      {!immersive && <Nav />}
      <main className="flex-1">{children}</main>
      {!immersive && <Footer />}
    </>
  );
}
