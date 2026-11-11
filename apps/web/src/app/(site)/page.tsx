import { Checkpoints } from "@/components/home/checkpoints";
import { Hero } from "@/components/home/hero";
import { Install } from "@/components/home/install";
import { LiveDemoIsland } from "@/components/home/live-demo-island";
import { Privacy } from "@/components/home/privacy";
import { SectionRail } from "@/components/home/section-rail";
import { SelfHost } from "@/components/home/self-host";
import { Statement } from "@/components/home/statement";
import { CLI_REPO_URL, SECTIONS, WEB_REPO_URL } from "@/components/site/links";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { siteConfig } from "@/lib/site-config";

const siteUrl = siteConfig.url;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "biga",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "macOS, Linux, Windows, FreeBSD",
      description:
        "Broadcast a local directory so others can watch it live in real time. No accounts; the session ID is the share link.",
      url: siteUrl,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Organization", name: siteConfig.author },
    },
    {
      "@type": "Organization",
      name: siteConfig.author,
      url: siteUrl,
      sameAs: [CLI_REPO_URL, WEB_REPO_URL],
    },
  ],
};

export default function Home() {
  const host = new URL(siteUrl).host;
  return (
    <div className="relative overflow-x-clip md:pb-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <main id="content">
        <Hero />
        <LiveDemoIsland host={host} />
        <Statement />
        <Privacy />
        <Checkpoints />
        <SelfHost />
        <Install />
      </main>
      <SectionRail sections={SECTIONS} />
      <SiteFooter />
    </div>
  );
}
