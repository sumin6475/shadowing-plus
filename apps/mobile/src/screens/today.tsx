// today.tsx — Today tab (sp-today.jsx).
import { Text, View } from "react-native";

import { SP } from "@/design/data";
import { useTheme } from "@/design/theme";
import { Avatar, Badge, Card, Header, Hero, Pill, Screen, Sect, Serif, StatTile } from "@/design/ui";
import type { Nav } from "./nav";

const WEEK = [
  { h: 96, on: true, d: "M" },
  { h: 40, on: false, d: "T" },
  { h: 72, on: true, d: "W" },
  { h: 20, on: false, d: "T" },
  { h: 112, on: true, d: "F" },
  { h: 10, on: false, d: "S" },
  { h: 10, on: false, d: "S" },
];

export function TodayScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const ph = SP.phrases;
  return (
    <Screen>
      <Header
        eyebrow="Friday, July 25"
        title={
          <Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>Good evening,{"\n"}Sumin.</Serif>
        }
        sub="Ready to make one phrase usable?"
        right={<Avatar onPress={() => nav.push("settings")} />}
      />

      <Hero style={{ marginTop: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.8, color: "rgba(255,255,255,0.75)" }}>
          TODAY’S SPEAKING MOMENT
        </Text>
        <Serif style={{ fontSize: 22, lineHeight: 27, color: "#fff", marginTop: 10, marginBottom: 8 }}>
          Explain what you do in 30 seconds.
        </Serif>
        <Text style={{ fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.85)" }}>
          You practiced this before. Let’s make it easier to say without thinking.
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 18, alignItems: "center" }}>
          <Pill tone="white" onPress={() => nav.go("speak")} textStyle={{ color: t.colors.accD }} style={{ shadowOpacity: 0 }}>
            Start speaking
          </Pill>
          <Pill tone="ghost" onPress={() => nav.go("speak")} textStyle={{ color: "rgba(255,255,255,0.9)" }}>
            Warm up first
          </Pill>
        </View>
      </Hero>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.gap }}>
        <StatTile
          tone="sky"
          label="Ready to refresh"
          value="3"
          unit="/ 8 phrases"
          foot="take the plunge, come across as"
          onPress={() => nav.push("review", { id: 1 })}
        />
        <StatTile
          tone="blush"
          label="A 5-minute reset"
          value="5"
          unit="min"
          foot="1 warm-up · 2 speaking · 2 review"
          onPress={() => nav.go("speak")}
        />
        <StatTile
          tone="sage"
          span
          label="What I do topic"
          value="2"
          unit="of 8 ready to use"
          foot="Your strongest topic right now"
          onPress={() => nav.push("island", { id: "what" })}
        />
      </View>

      <Sect title="Bring these back" action="See all" onAction={() => nav.go("phrases")} />
      {[ph[0], ph[1]].map((p) => (
        <Card key={p.id} onPress={() => nav.push("phrase", { id: p.id })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>{p.txt}</Text>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3 }}>
              {p.status === "Recognizing" ? "You recognized this, but haven’t used it yet" : "Last used " + p.last}
            </Text>
          </View>
          <Badge s={p.status} />
        </Card>
      ))}

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>English you actually used</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.accD }}>this week</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 20, alignItems: "flex-end", height: 130 }}>
          {WEEK.map((b, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 4, justifyContent: "flex-end", height: "100%" }}>
              <View
                style={{
                  width: "100%",
                  height: b.h,
                  borderRadius: 9999,
                  backgroundColor: b.on ? t.colors.acc : t.colors.soft,
                }}
              />
              <Text style={{ fontSize: 11, color: t.colors.ink3, fontWeight: "600" }}>{b.d}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 12, lineHeight: 20 }}>
          3 phrases used on your own · 4 speaking attempts. Progress is your English showing up when you need it.
        </Text>
      </Card>
    </Screen>
  );
}
