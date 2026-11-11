"use client";

import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from "react";

export function clientLazy<Props extends object>(loader: () => Promise<ComponentType<Props>>, fallback: ReactNode = null) {
    const Component = lazy(async () => ({ default: await loader() }));
    return function ClientLazy(props: Props) {
        const [mounted, setMounted] = useState(false);
        useEffect(() => setMounted(true), []);
        if (!mounted) return fallback;
        return <Suspense fallback={fallback}><Component {...props} /></Suspense>;
    };
}
