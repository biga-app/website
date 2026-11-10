const githubOrg = "biga-app";

export const siteConfig = {
  name: "biga",
  author: "n10nce.dev",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://biga.n10nce.dev",
  githubOrg,
  cliRepoUrl: `https://github.com/${githubOrg}/cli`,
  webRepoUrl: `https://github.com/${githubOrg}/website`,
};
