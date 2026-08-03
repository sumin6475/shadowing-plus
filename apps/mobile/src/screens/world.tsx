// world.tsx — Topics tab (default "world"): Speaking World map + Domain,
// Story, Message, Recommendations detail screens (sp-world.jsx).
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { useTheme, type Theme } from "@/design/theme";
import { Avatar, BackBar, Card, Header, Icon, Pill, Screen, Sect, Serif, toneColor } from "@/design/ui";
import type { IconName } from "@/design/icon";
import type { Nav } from "./nav";

const SW_DOMAINS = [
  { id: "about", name: "About me", tone: "sage", n: 3, size: 116, x: 14, y: 36 },
  { id: "work", name: "Work / Study", tone: "sky", n: 4, size: 152, x: 198, y: 8, hi: true },
  { id: "exp", name: "Experiences", tone: "blush", n: 2, size: 108, x: 6, y: 210 },
  { id: "daily", name: "Daily life", tone: "butter", n: 3, size: 124, x: 214, y: 200 },
  { id: "ideas", name: "Ideas", tone: null as string | null, n: 3, size: 112, x: 76, y: 348 },
];

type Story = { id: string; name: string; chip: string; meta: string; tile: string; glyph: IconName };
const SW_STORIES: Record<string, Story[]> = {
  work: [
    { id: "startup", name: "My startup", chip: "Practicing", meta: "5 sessions · 8 phrases", tile: "sage", glyph: "sparkle" },
    { id: "project", name: "Current project", chip: "Building", meta: "3 sessions · 4 phrases", tile: "sky", glyph: "text" },
    { id: "interview", name: "Interview", chip: "Started", meta: "2 sessions · 5 phrases", tile: "blush", glyph: "mic" },
    { id: "research", name: "My research", chip: "Suggested", meta: "Tap to explore", tile: "butter", glyph: "search" },
  ],
  about: [
    { id: "background", name: "My background", chip: "Practicing", meta: "3 sessions · 4 phrases", tile: "sky", glyph: "sun" },
    { id: "think", name: "How I think", chip: "Started", meta: "1 session · 2 phrases", tile: "sage", glyph: "sparkle" },
    { id: "hobbies", name: "Outside work", chip: "Suggested", meta: "Tap to explore", tile: "blush", glyph: "play" },
  ],
  exp: [
    { id: "seoul", name: "Living in Seoul", chip: "Started", meta: "1 session · 3 phrases", tile: "butter", glyph: "map" },
    { id: "trip", name: "A trip that changed me", chip: "Suggested", meta: "Tap to explore", tile: "sky", glyph: "arrow" },
  ],
  daily: [
    { id: "mornings", name: "My mornings", chip: "Building", meta: "2 sessions · 3 phrases", tile: "sage", glyph: "sun" },
    { id: "choices", name: "Small decisions", chip: "Started", meta: "1 session · 1 phrase", tile: "blush", glyph: "check" },
    { id: "weekend", name: "Weekend rituals", chip: "Suggested", meta: "Tap to explore", tile: "sky", glyph: "bell" },
  ],
  ideas: [
    { id: "ai", name: "AI and learning", chip: "Practicing", meta: "2 sessions · 4 phrases", tile: "sky", glyph: "sparkle" },
    { id: "speakfirst", name: "Why speaking first", chip: "Started", meta: "1 session · 2 phrases", tile: "butter", glyph: "mic" },
    { id: "products", name: "Small products", chip: "Suggested", meta: "Tap to explore", tile: "sage", glyph: "pen" },
  ],
};
const SW_DSUB: Record<string, string> = {
  work: "Everything about your work, studies, and the things you build.",
  about: "Who you are, told the way you’d tell a friend.",
  exp: "Moments and places that shaped you.",
  daily: "The small everyday things you can narrate.",
  ideas: "Opinions and thoughts you want to be able to defend.",
};
const SW_MSGS: Record<string, { id: string; name: string; n: number; hi?: boolean }[]> = {
  startup: [
    { id: "pitch", name: "Elevator pitch (30 sec)", n: 5, hi: true },
    { id: "friend", name: "Explaining to a friend", n: 2 },
    { id: "why", name: "Why I started", n: 1 },
  ],
};
const SW_BEATS: Record<string, string[]> = { pitch: ["What I’m building", "Who it helps", "The problem I solve", "How it works", "Why it matters"] };
const SW_MPHRASES = [
  { txt: "What I’m trying to do is…", chip: "Ready to use", tile: "sage" },
  { txt: "The biggest problem is…", chip: "Practicing", tile: "sky" },
  { txt: "What makes this different is…", chip: "Needs practice", tile: "blush" },
];

function wChipColors(t: Theme, label: string): { bg: string; fg: string; dashed?: boolean } {
  if (label === "Suggested") return { bg: "transparent", fg: t.colors.ink3, dashed: true };
  const map: Record<string, [string, string]> = {
    Practicing: [t.colors.butter, t.colors.onB],
    Building: [t.colors.sky, t.colors.onB],
    Started: [t.colors.blush, t.colors.onB],
    "Ready to use": [t.colors.sage, t.colors.onB],
    "Needs practice": [t.colors.accS, t.colors.accD],
  };
  const [bg, fg] = map[label] ?? [t.colors.soft, t.colors.ink2];
  return { bg, fg };
}
function WChip({ label, style }: { label: string; style?: object }) {
  const t = useTheme();
  const { bg, fg, dashed } = wChipColors(t, label);
  return (
    <View
      style={[
        { backgroundColor: bg, borderRadius: 999, paddingHorizontal: dashed ? 9 : 10, paddingVertical: dashed ? 3 : 4, borderWidth: dashed ? 1.5 : 0, borderColor: t.colors.ink3, borderStyle: dashed ? "dashed" : "solid" },
        style,
      ]}
    >
      <Text style={{ color: fg, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}
function WTile({ tone = "sky", glyph = "text", s = 40 }: { tone?: string; glyph?: IconName; s?: number }) {
  const t = useTheme();
  return (
    <View style={{ width: s, height: s, borderRadius: s * 0.36, backgroundColor: toneColor(t, tone), alignItems: "center", justifyContent: "center" }}>
      <Icon name={glyph} s={s * 0.45} c={t.colors.onB} />
    </View>
  );
}

export function SpeakingWorldScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  return (
    <Screen>
      <Header
        eyebrow="Topics"
        title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>Your{"\n"}Speaking World</Serif>}
        sub="It grows every time you talk."
        right={<Avatar onPress={() => nav.push("settings")} />}
      />
      <View style={{ height: 486, marginTop: 2 }}>
        <Svg viewBox="0 0 357 486" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          <Path
            d="M128 94 L200 84 M74 152 L74 210 M262 160 L272 200 M112 268 L128 350 M258 320 L184 372 M130 130 L226 208"
            fill="none"
            stroke={t.colors.sep}
            strokeWidth={2}
            strokeDasharray="1 8"
            strokeLinecap="round"
          />
          <Circle cx={164} cy={89} r={3} fill={t.colors.acc} opacity={0.45} />
          <Circle cx={196} cy={176} r={3} fill={t.colors.acc} opacity={0.35} />
          <Circle cx={120} cy={308} r={3} fill={t.colors.acc} opacity={0.35} />
        </Svg>
        {SW_DOMAINS.map((d) => (
          <Card
            key={d.id}
            onPress={() => nav.push("domain", { id: d.id })}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              padding: 10,
              backgroundColor: d.tone ? toneColor(t, d.tone) : t.colors.card,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              borderWidth: d.hi ? 2 : undefined,
              borderColor: d.hi ? t.colors.acc : undefined,
            }}
          >
            <Text style={{ fontSize: d.size > 130 ? 16 : 14.5, fontWeight: "800", color: d.tone ? t.colors.onB : t.colors.ink, textAlign: "center" }}>
              {d.name}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: d.tone ? t.colors.onB2 : t.colors.ink3 }}>{d.n} stories</Text>
          </Card>
        ))}
        <Pill icon="plus" onPress={() => nav.push("newIsland")} style={{ position: "absolute", right: 6, bottom: 26, width: 54, height: 54, paddingHorizontal: 0 }} />
      </View>
      <Card onPress={() => nav.push("recs")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 16, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkle" s={18} c={t.colors.accD} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Recommendations</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 1 }}>Ideas to grow your speaking world</Text>
        </View>
        <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
      </Card>
    </Screen>
  );
}

export function DomainScreen({ id, nav }: { id: string; nav: Nav }) {
  const t = useTheme();
  const d = SW_DOMAINS.find((x) => x.id === id) ?? SW_DOMAINS[1];
  const stories = SW_STORIES[id] ?? [];
  const glyph = ({ work: "text", about: "sun", exp: "map", daily: "bell", ideas: "sparkle" } as Record<string, IconName>)[id] ?? "text";
  return (
    <Screen>
      <BackBar onBack={nav.pop} right={<Pill tone="white" small icon="dots" style={{ width: 44, height: 44, paddingHorizontal: 0 }} />} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 2, paddingTop: 4 }}>
        <View style={{ flex: 1 }}>
          <Serif style={{ fontSize: 32, lineHeight: 35, color: t.colors.ink }}>{d.name}</Serif>
          <Text style={{ fontSize: 14.5, color: t.colors.ink2, marginTop: 8, lineHeight: 21 }}>{SW_DSUB[id]}</Text>
        </View>
        <WTile tone={d.tone ?? "sky"} glyph={glyph} s={58} />
      </View>
      <Sect title="Stories" action="+ New story" onAction={() => nav.push("newIsland")} />
      {stories.map((s) => (
        <Card key={s.id} onPress={() => nav.push("story", { did: id, sid: s.id })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <WTile tone={s.tile} glyph={s.glyph} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 15.5, fontWeight: "700", color: t.colors.ink }}>{s.name}</Text>
              <WChip label={s.chip} />
            </View>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3 }}>{s.meta}</Text>
          </View>
          <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
        </Card>
      ))}
    </Screen>
  );
}

export function StoryScreen({ did, sid, nav }: { did: string; sid: string; nav: Nav }) {
  const t = useTheme();
  const s = (SW_STORIES[did] ?? []).find((x) => x.id === sid) ?? SW_STORIES.work[0];
  const msgs = SW_MSGS[sid] ?? [{ id: "simple", name: "Explain it simply", n: 1, hi: true }];
  return (
    <Screen>
      <BackBar onBack={nav.pop} />
      <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
        <Serif style={{ fontSize: 30, lineHeight: 33, color: t.colors.ink }}>{s.name}</Serif>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginTop: 9 }}>
          <WChip label={s.chip === "Suggested" ? "Started" : s.chip} />
          <Text style={{ fontSize: 14, color: t.colors.ink2 }}>Your story is getting clearer.</Text>
        </View>
      </View>
      <Pill full icon="mic" onPress={() => nav.startTalk({ ctx: s.name, from: "topics" })} style={{ marginTop: 6 }}>
        Talk about this story
      </Pill>
      <Text style={{ textAlign: "center", fontSize: 13, color: t.colors.ink3, marginTop: -4 }}>Start a self-talk session</Text>
      <Sect title="Messages" action="+ New message" />
      {msgs.map((m) => (
        <Card
          key={m.id}
          onPress={() => nav.push("message", { did, sid, mid: m.id })}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: m.hi ? 2 : undefined, borderColor: m.hi ? t.colors.acc : undefined }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
            <Icon name="text" s={18} c={t.colors.accD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15.5, fontWeight: "700", color: t.colors.ink }}>{m.name}</Text>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>
              {m.n} session{m.n > 1 ? "s" : ""}
            </Text>
          </View>
          <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
        </Card>
      ))}
      <Sect title="Useful language" action="See all" onAction={() => nav.go("phrases")} />
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 14, backgroundColor: t.colors.sage, alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkle" s={15} c={t.colors.onB} />
        </View>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: t.colors.ink }}>What I’m trying to do is…</Text>
        <WChip label="Ready to use" />
      </Card>
    </Screen>
  );
}

export function MessageScreen({ did, sid, mid, nav }: { did: string; sid: string; mid: string; nav: Nav }) {
  const t = useTheme();
  const s = (SW_STORIES[did] ?? []).find((x) => x.id === sid) ?? SW_STORIES.work[0];
  const m = (SW_MSGS[sid] ?? []).find((x) => x.id === mid) ?? { name: "Explain it simply", n: 1 };
  const beats = SW_BEATS[mid] ?? ["The one-line version", "One concrete example", "Why it matters to me"];
  return (
    <Screen>
      <BackBar title={m.name} onBack={nav.pop} right={<Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.accD }}>Edit</Text>} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 2 }}>
        <WChip label="Practicing" />
        <Text style={{ fontSize: 13.5, color: t.colors.ink3, fontWeight: "600" }}>{m.n} sessions</Text>
      </View>
      <View style={{ paddingHorizontal: 2, paddingTop: 4 }}>
        <Serif style={{ fontSize: 22, color: t.colors.ink }}>Your message</Serif>
        <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3 }}>The key points you want to communicate.</Text>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        {beats.map((b, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50, borderBottomWidth: i < beats.length - 1 ? 1 : 0, borderBottomColor: t.colors.sep }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: t.colors.accD }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: t.colors.ink }}>{b}</Text>
            <Icon name="text" s={15} c={t.colors.ink3} />
          </View>
        ))}
      </Card>
      <Sect title="Good phrases for this message" action="+ Add" onAction={() => nav.go("phrases")} />
      <Card style={{ paddingVertical: 4 }}>
        {SW_MPHRASES.map((p, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 11, minHeight: 56, borderBottomWidth: i < SW_MPHRASES.length - 1 ? 1 : 0, borderBottomColor: t.colors.sep }}>
            <WTile tone={p.tile} glyph="bank" s={34} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.ink }}>{p.txt}</Text>
              <WChip label={p.chip} style={{ marginTop: 4, alignSelf: "flex-start" }} />
            </View>
            <Icon name="dots" s={16} c={t.colors.ink3} />
          </View>
        ))}
      </Card>
      <Pill full icon="mic" onPress={() => nav.startTalk({ ctx: s.name, sub: m.name, prompt: "What I’m trying to do is…", beats, from: "topics" })} style={{ marginTop: 4 }}>
        Talk with this message
      </Pill>
    </Screen>
  );
}

export function RecsScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const recs = [
    { t: "Moving abroad", sub: "A meaningful experience to express in English.", icon: "map" as IconName, tone: "sky", q: "What would moving abroad mean to you?" },
    { t: "Biggest challenge", sub: "Share a challenge you overcame and what you learned.", icon: "sparkle" as IconName, tone: "butter", q: "What’s a challenge you overcame recently?" },
  ];
  return (
    <Screen>
      <BackBar onBack={nav.pop} />
      <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
        <Serif style={{ fontSize: 30, color: t.colors.ink }}>Recommendations</Serif>
        <Text style={{ fontSize: 14.5, color: t.colors.ink2, marginTop: 7 }}>Ideas to grow your speaking world</Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 8 }}>You’ve been focusing on</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {["Work / Study", "Ideas"].map((c) => (
          <View key={c} style={[{ backgroundColor: t.colors.card, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 0.5, borderColor: t.ring }, t.shadowCard]}>
            <Text style={{ fontSize: 13.5, fontWeight: "600", color: t.colors.ink2 }}>{c}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 10 }}>You might like to add</Text>
      {recs.map((r, i) => (
        <Card key={i} lg style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>{r.t}</Text>
            <Text style={{ fontSize: 13.5, color: t.colors.ink2, marginTop: 4, lineHeight: 20 }}>{r.sub}</Text>
            <Pressable onPress={() => nav.startTalk({ ctx: r.t, prompt: r.q, from: "topics" })} style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: t.colors.accD }}>Start talking about this</Text>
              <Icon name="arrow" s={14} w={2} c={t.colors.accD} />
            </Pressable>
          </View>
          <WTile tone={r.tone} glyph={r.icon} s={62} />
        </Card>
      ))}
    </Screen>
  );
}
