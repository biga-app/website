import type { Metadata } from "next";

import { DemoProvider } from "@/components/demo/demo-provider";

export const metadata: Metadata = {
  title: "Live demo",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DemoProvider>{children}</DemoProvider>;
}
