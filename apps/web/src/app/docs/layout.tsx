import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

import { BigaLogo } from "@biga/ui/components/biga-mark";
import { CLI_REPO_URL } from "@/components/site/links";
import { ThemeSwitch } from "@/components/site/theme-switch";
import { source } from "@/lib/source";

/*
 * Documentation lives in Fumadocs. The site already provides next-themes at
 * the root, so Fumadocs' own theme provider is switched off and its theme
 * toggle is replaced with the site's, which keeps the wipe transition.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false }}>
      <div className="fd-docs flex min-h-screen flex-col">
        <DocsLayout
          tree={source.getPageTree()}
          nav={{ title: <BigaLogo />, url: "/" }}
          githubUrl={CLI_REPO_URL}
          links={[
            { text: "Home", url: "/" },
            { text: "Demo", url: "/#demo" },
          ]}
          themeSwitch={{ component: <ThemeSwitch /> }}
        >
          {children}
        </DocsLayout>
      </div>
    </RootProvider>
  );
}
