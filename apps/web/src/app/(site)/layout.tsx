import { siteFontClassName } from "@/lib/site-fonts";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={`${siteFontClassName} contents`}>{children}</div>;
}
