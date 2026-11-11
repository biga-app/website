import { BroadcastProvider } from "@/components/home/broadcast-clock";
import { Checkpoints } from "@/components/home/checkpoints";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { Privacy } from "@/components/home/privacy";
import { Reading } from "@/components/home/reading";
import { SelfHost } from "@/components/home/self-host";
import { Statement } from "@/components/home/statement";
import { TryIt } from "@/components/home/try-it";
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
  const host = new URL(siteUrl).host;
  return (
    <div className="relative overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <BroadcastProvider>
        <main id="content">
          <Hero siteUrl={siteUrl} sessionPath={sessionPath} />
          <Statement />
          <HowItWorks host={host} />
          <Reading />
          <Privacy />
          <Checkpoints />
          <SelfHost />
          <TryIt sessionPath={sessionPath} />
        </main>
      </BroadcastProvider>
      <SiteFooter />
    </div>
  );
}
