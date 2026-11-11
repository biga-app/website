"use client";

import { Fragment, useLayoutEffect, useRef } from "react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@biga/ui/components/breadcrumb";

export function CodeBreadcrumbs({ path }: { path: string }) {
    const segments = path.split("/");
    const scrollRef = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        const element = scrollRef.current;
        if (element) element.scrollLeft = element.scrollWidth;
    }, [path]);

    return (
        <Breadcrumb
            ref={scrollRef}
            aria-label="File path"
            className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            <BreadcrumbList className="w-max flex-nowrap gap-0.5 px-3 text-xs sm:gap-0.5">
                {segments.map((segment, index) => {
                    const last = index === segments.length - 1;
                    return (
                        <Fragment key={index}>
                            {index > 0 ? <BreadcrumbSeparator /> : null}
                            <BreadcrumbItem>
                                {last ? <BreadcrumbPage>{segment}</BreadcrumbPage> : <span>{segment}</span>}
                            </BreadcrumbItem>
                        </Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
