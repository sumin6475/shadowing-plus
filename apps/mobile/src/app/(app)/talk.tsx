// Talk tab — the full-screen self-talk mirror. TabHost only mounts the live
// mic screen while this tab is focused, and the tab bar hides meanwhile.
import { TabHost } from "@/shell";

export default function TalkRoute() {
  return <TabHost tab="speak" />;
}
