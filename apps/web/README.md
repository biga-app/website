# apps/web

The Next.js app behind biga: the landing page, the documentation and the
read-only session viewer. Sessions come from the Go
[API server](https://github.com/biga-app/server), which `/api/sessions/*` is
proxied to.

See the [repository README](../../README.md) for setup, configuration and how
the pieces fit together.

## Where things are

| Path | What lives there |
| --- | --- |
| `src/app/page.tsx`, `src/components/home` | The landing page. |
| `content/docs`, `src/app/docs` | The documentation: MDX pages rendered by [Fumadocs](https://fumadocs.dev), with Mermaid diagrams in fenced `mermaid` blocks. |
| `src/app/brand`, `public/brand` | The brand page and its downloadable files. |
| `src/app/session/[sessionId]` | The viewer. |
| `src/lib/session-api.ts`, `src/lib/use-session-stream.ts` | How the viewer reads the API server. |
| `src/components/showcase`, `src/lib/showcase` | The landing page's use of the real viewer, fed from a committed snapshot instead of a server. |
| `src/components/ui` | shadcn-style primitives, plus the vendored [keyframeui](https://keyframeui.com) components (`circuit`, `autopilot`, `exploded-ui`). Update those with the registry, not by hand. |

## Commands

```sh
pnpm dev          # next dev on :3000
pnpm build        # next build
pnpm lint         # eslint, no warnings allowed
pnpm check-types  # next typegen && tsc --noEmit
```

Docs content changes need a dev-server restart to be picked up.
