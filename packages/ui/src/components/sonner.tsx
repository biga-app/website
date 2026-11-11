"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Sonner, themed to follow the app's resolved light/dark mode. Mount once per
 * route that toasts; toasts are reserved for feedback that has nowhere else to
 * go, such as an action picked from a menu that has already closed.
 */
function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      offset={16}
      mobileOffset={12}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "!text-[13px]" } }}
      {...props}
    />
  );
}

export { Toaster };
