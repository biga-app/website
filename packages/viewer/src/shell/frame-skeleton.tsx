import { Skeleton } from "@biga/ui/components/skeleton";
import { CodeSkeleton } from "@biga/viewer/viewer/code-skeleton";

export function FrameSkeleton({ inline = false }: { inline?: boolean }) {
    return (
        <div className={inline ? "flex h-full min-h-0 flex-col" : "flex h-svh flex-col"}>
            <div className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
                <Skeleton className="size-7" />
                <Skeleton className="h-3.5 w-40" />
                <div className="ms-auto flex items-center gap-2">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="hidden h-7 w-52 lg:block" />
                    <Skeleton className="size-7" />
                </div>
            </div>
            <div className="flex min-h-0 flex-1">
                <div className="bg-sidebar hidden w-11 shrink-0 border-e md:block" />
                <div className="bg-sidebar hidden w-[22%] max-w-80 shrink-0 space-y-3 border-e px-3 py-3 md:block">
                    <Skeleton className="h-2.5 w-12" />
                    {Array.from({ length: 10 }).map((_, i) => (
                        <Skeleton key={i} className="h-3" style={{ width: `${45 + ((i * 17) % 45)}%` }} />
                    ))}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="h-10 shrink-0 border-b" />
                    <div className="h-8 shrink-0 border-b" />
                    <CodeSkeleton />
                </div>
            </div>
            <p role="status" className="sr-only">
                Loading session…
            </p>
        </div>
    );
}
