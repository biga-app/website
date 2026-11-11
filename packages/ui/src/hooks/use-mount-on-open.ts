import { useState } from "react";

export function useMountOnOpen(open: boolean): boolean {
    const [mounted, setMounted] = useState(open);
    if (open && !mounted) setMounted(true);
    return mounted;
}
