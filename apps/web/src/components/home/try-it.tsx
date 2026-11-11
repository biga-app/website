import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";

import { HomeSection, SectionTitle } from "@/components/home/section";
import { JoinForm } from "@/components/landing/join-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function TryIt({ sessionPath }: { sessionPath: string }) {
  return (
    <HomeSection id="demo" className="border-b-0">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <SectionTitle
          title="Open a real broadcast."
          lead="The demo above is a recorded session of this project. Open it full screen, or paste a link someone sent you."
        />
        <Card>
          <CardContent className="flex flex-col gap-5">
            <JoinForm />
            <Button render={<Link href={sessionPath} />} size="lg" className="w-fit">
              Open the demo session
              <ArrowUpRightIcon />
            </Button>
          </CardContent>
        </Card>
      </div>
    </HomeSection>
  );
}
