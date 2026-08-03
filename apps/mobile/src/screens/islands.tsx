// islands.tsx — Island detail + create (sp-islands.jsx). The grid map variant
// is a tweak-only alternate; the default Topics tab is the Speaking World.
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { SP } from "@/design/data";
import { useTheme } from "@/design/theme";
import { BackBar, Badge, Block, Card, Chip, Header, Icon, Pill, Row, Screen, Sect, Serif } from "@/design/ui";
import type { Nav } from "./nav";

export function IslandDetail({ id, nav }: { id: string; nav: Nav }) {
  const t = useTheme();
  const il = SP.islands.find((x) => x.id === id) ?? SP.islands[0];
  const phrases = SP.phrases.filter((p) => p.island === il.name).slice(0, 3);
  const label = (s: string) => (
    <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.accD }}>{s}</Text>
  );
  return (
    <Screen>
      <BackBar title="Topic" onBack={nav.pop} />
      <Block tone={il.tone} style={{ padding: t.padc + 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Serif style={{ fontSize: 28, color: t.colors.onB }}>{il.name}</Serif>
          <View style={{ backgroundColor: t.colors.card, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
            <Text style={{ color: t.colors.ink2, fontSize: 11, fontWeight: "700" }}>{il.state}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: t.colors.onB2, marginTop: 8 }}>
          {il.ph} phrases · {il.tries} speaking attempts · {il.ready} ideas ready
        </Text>
      </Block>
      <Row>
        <Card style={{ flex: 1 }}>
          {label("YOU CAN ALREADY SAY")}
          <Text style={{ fontSize: 13, lineHeight: 20, marginTop: 7, color: t.colors.ink2 }}>{il.can.length ? il.can.join(" · ") : "—"}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          {label("WORTH PRACTICING")}
          <Text style={{ fontSize: 13, lineHeight: 20, marginTop: 7, color: t.colors.ink2 }}>{il.worth.join(" · ")}</Text>
        </Card>
      </Row>
      <Sect title="Questions to try" />
      {il.qs.map((q, i) => (
        <Card key={i} onPress={() => nav.go("speak")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 16, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
            <Icon name="mic" s={17} c={t.colors.accD} />
          </View>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: t.colors.ink }}>{q}</Text>
          <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
        </Card>
      ))}
      {phrases.length > 0 ? (
        <>
          <Sect title="Phrases here" action="All phrases" onAction={() => nav.go("phrases")} />
          {phrases.map((p) => (
            <Card key={p.id} onPress={() => nav.push("phrase", { id: p.id })} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{p.txt}</Text>
                <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>{p.ko}</Text>
              </View>
              <Badge s={p.status} />
            </Card>
          ))}
        </>
      ) : null}
      <Row>
        <Pill full icon="mic" onPress={() => nav.go("speak")}>
          Answer a question
        </Pill>
        <Pill tone="tint" full icon="ear">
          My last answer
        </Pill>
      </Row>
    </Screen>
  );
}

export function IslandCreate({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [v, setV] = useState("");
  const [made, setMade] = useState(false);
  const ideas = ["My design background", "My startup idea", "Moving to the U.S.", "A project I’m proud of"];
  return (
    <Screen>
      <BackBar title="New topic" onBack={nav.pop} />
      <Header title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>What do you want to{"\n"}become able to talk about?</Serif>} />
      <Card lg style={{ padding: 8 }}>
        <TextInput
          value={v}
          onChangeText={(x) => {
            setV(x);
            setMade(false);
          }}
          placeholder="e.g. My design background"
          placeholderTextColor={t.colors.ink3}
          style={{ fontSize: 17, fontWeight: "600", padding: 12, color: t.colors.ink }}
        />
      </Card>
      <View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap" }}>
        {ideas.map((x) => (
          <Chip
            key={x}
            active={v === x}
            onPress={() => {
              setV(x);
              setMade(false);
            }}
          >
            {x}
          </Chip>
        ))}
      </View>
      {!made ? (
        <Pill full icon="sparkle" onPress={() => v && setMade(true)} style={{ opacity: v ? 1 : 0.45 }}>
          Start this topic
        </Pill>
      ) : (
        <>
          <Sect title="Your first questions" />
          {["What is this about?", "Why does it matter to you?", "What do you want people to understand?", "What’s hard to explain in English?"].map((q, i) => (
            <Card key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: t.colors.accD }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.ink }}>{q}</Text>
            </Card>
          ))}
          <Pill
            full
            icon="mic"
            onPress={() => {
              nav.pop();
              nav.go("speak");
            }}
          >
            Answer the first one
          </Pill>
        </>
      )}
    </Screen>
  );
}
