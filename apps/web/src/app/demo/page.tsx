import { DemoViewer } from "@/components/demo/demo-viewer";
import { SavesToggle } from "@/components/demo/saves-toggle";

export default function DemoPage() {
  return (
    <DemoViewer surface="page">
      <SavesToggle />
    </DemoViewer>
  );
}
