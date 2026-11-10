import { Checkpoints } from "@/components/home/checkpoints";
import { Demo } from "@/components/home/demo";
import { Features } from "@/components/home/features";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { Install } from "@/components/home/install";
import { Marquee } from "@/components/home/marquee";
import { Privacy } from "@/components/home/privacy";
import { Statement } from "@/components/home/statement";
import { HatchBand } from "@/components/site/frame";
import { CLI_REPO_URL, WEB_REPO_URL } from "@/components/site/links";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { DEMO_SESSION_ID } from "@/lib/demo-session";
import { siteConfig } from "@/lib/site-config";

const siteUrl = siteConfig.url;
const sessionPath = `/session/${DEMO_SESSION_ID}`;

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
  return (
    <div className="biga-landing font-body relative overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <SiteHeader />

      <main id="content">
        <Hero siteUrl={siteUrl} />
        <Marquee />
        <Statement />
        <HowItWorks siteUrl={siteUrl} />
        <Checkpoints />
        <Privacy siteUrl={siteUrl} />
        <Features />
        <Demo siteUrl={siteUrl} sessionPath={sessionPath} />
        <HatchBand />
        <Install siteUrl={siteUrl} />
      </main>

      <SiteFooter />
    </div>
  );
}
