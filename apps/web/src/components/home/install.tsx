import { HomeSection, SectionTitle } from "@/components/home/section";
import { JoinForm } from "@/components/landing/join-form";
import { CommandBlock } from "@/components/site/command-block";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@biga/ui/components/card";

export function Install() {
  return (
    <HomeSection id="install" className="border-b-0">
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
        <SectionTitle title="Start your own broadcast." lead="Install the CLI, run biga start in a folder, and send the link. Nobody needs an account." />
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent>
              <CommandBlock />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Got a link?</CardTitle>
              <CardDescription>Paste a session link someone sent you to join their broadcast.</CardDescription>
            </CardHeader>
            <CardContent>
              <JoinForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </HomeSection>
  );
}
