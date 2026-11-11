import { PixelsVsTextFigure } from "@/components/art/pixels-vs-text-figure";
import { HomeSection } from "@/components/home/section";
import { Typography } from "@/components/ui/typography";

export function Statement() {
  return (
    <HomeSection>
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <Typography variant="statement" className="max-w-[26ch]">
          A screen share sends pixels. biga sends the files themselves, so viewers can select, search and scroll at their own pace.
        </Typography>
        <PixelsVsTextFigure />
      </div>
    </HomeSection>
  );
}
