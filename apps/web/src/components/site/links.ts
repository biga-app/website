import { siteConfig } from "@/lib/site-config";

/** Where biga lives. The CLI and the server are separate repositories. */
export const CLI_REPO_URL = siteConfig.cliRepoUrl;
export const WEB_REPO_URL = siteConfig.webRepoUrl;
export const RELEASES_URL = `${CLI_REPO_URL}/releases/latest`;
export const ISSUES_URL = `${CLI_REPO_URL}/issues`;

/** Section anchors on the home page, shared by the header and the footer. */
export const SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "privacy", label: "Privacy" },
  { id: "demo", label: "Demo" },
] as const;
