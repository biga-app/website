import { FollowFigure } from "@/components/art/follow-figure";
import { HomeSection, SectionTitle } from "@/components/home/section";
import { HowTabs } from "@/components/home/how-tabs";

export function HowItWorks({ host }: { host: string }) {
  return (
    <HomeSection id="how">
      <SectionTitle title="Run it, share it, keep coding." lead="A session takes three steps and one command. After that you just save files." />
      <div className="mt-10 lg:mt-12">
        <HowTabs host={host} follow={<FollowFigure />} />
      </div>
    </HomeSection>
  );
}
