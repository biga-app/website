"use client";

import { createContext, useContext, type ComponentType, type ComponentProps, type ReactNode } from "react";

export type ViewerHost = {
    Link: ComponentType<ComponentProps<"a"> & { href: string }>;
    homeHref: string;
    links: { docs: string; source: string; issues: string };
    renderJoin: () => ReactNode;
    surface: "page" | "inline";
};

const defaults: ViewerHost = {
    Link: (props) => <a {...props} />,
    homeHref: "/",
    links: { docs: "/docs", source: "https://github.com/biga-app/biga", issues: "https://github.com/biga-app/biga/issues" },
    renderJoin: () => null,
    surface: "page",
};

const HostContext = createContext<ViewerHost>(defaults);

export function ViewerHostProvider({ value, children }: { value: Partial<ViewerHost>; children: ReactNode }) {
    return <HostContext.Provider value={{ ...defaults, ...value }}>{children}</HostContext.Provider>;
}

export function useViewerHost(): ViewerHost {
    return useContext(HostContext);
}
