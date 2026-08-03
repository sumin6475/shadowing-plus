// phrases.tsx — Phrase Bank tab: list + chart, detail, review flow (sp-phrases.jsx).
import { Fragment, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { SP, type Phrase } from "@/design/data";
import { useTheme } from "@/design/theme";
import { Avatar, BackBar, Badge, Card, Chip, Header, Hero, Icon, Pill, Row, Screen, Serif, StatTile, Wave } from "@/design/ui";
import type { Nav } from "./nav";

function BankChart() {
  const t = useTheme();
  const pts = [2, 5, 5, 9, 14, 16, 20, 21, 26, 30, 31, 36, 41, 44, 48];
  const W = 320,
    H = 96,
    mx = 6;
  const X = (i: number) => mx + (i * (W - 2 * mx)) / (pts.length - 1);
  const Y = (v: number) => H - 8 - (v / 48) * (H - 22);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  return (
    <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
      <Svg viewBox={`0 0 ${W} ${H + 16}`} width="100%" height={130}>
        {[48, 24, 0].map((v) => (
          <Fragment key={v}>
            <Line x1={mx} x2={W - mx} y1={Y(v)} y2={Y(v)} stroke={t.colors.sep} strokeWidth={1} strokeDasharray="2 4" />
            <SvgText x={W - mx} y={Y(v) - 4} textAnchor="end" fontSize={9} fontWeight="650" fill={t.colors.ink3}>
              {v || ""}
            </SvgText>
          </Fragment>
        ))}
        <Path d={`${line}L${X(pts.length - 1)},${H - 8}L${X(0)},${H - 8}Z`} fill={t.colors.accS} opacity={0.55} />
        <Path d={line} fill="none" stroke={t.colors.acc} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={X(pts.length - 1)} cy={Y(48)} r={4.5} fill={t.colors.acc} stroke={t.colors.bg} strokeWidth={2.5} />
        {["Jul 1", "Jul 8", "Jul 15", "Jul 22", "Today"].map((d, i) => (
          <SvgText
            key={d}
            x={mx + (i * (W - 2 * mx)) / 4}
            y={H + 10}
            textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
            fontSize={9.5}
            fontWeight={i === 4 ? "750" : "600"}
            fill={i === 4 ? t.colors.accD : t.colors.ink3}
          >
            {d}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const FILTERS = ["All", "Due now", "New", "Practicing", "Ready to use", "Needs refresh", "Saved from video"];

export function PhrasesScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [q, setQ] = useState("");
  const [f, setF] = useState("All");
  const [searching, setSearching] = useState(false);
  const list = SP.phrases.filter((p) => {
    const s = (p.txt + p.ko + p.mean + p.island + p.src + p.tags.join(" ")).toLowerCase();
    if (q && !s.includes(q.toLowerCase())) return false;
    if (f === "All") return true;
    if (f === "Due now") return p.status === "Needs refresh" || p.status === "Recognizing";
    if (f === "Saved from video") return p.src.includes("story") || p.src.includes("clip");
    return p.status === f;
  });

  return (
    <Screen>
      <Header
        eyebrow="Your Phrase Bank"
        title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>English you chose{"\n"}to keep.</Serif>}
        right={<Avatar onPress={() => nav.push("settings")} />}
      />
      <BankChart />

      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 2, paddingTop: 2 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Summary</Text>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3 }}>JULY</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.gap }}>
        <StatTile tone="sky" label="Collected" value="48" unit="phrases" foot="+6 this week" />
        <StatTile tone="butter" label="Practiced" value="12" unit="phrases" foot="31 practice reps" />
        <StatTile tone="sage" label="Used on my own" value="9" unit="phrases" foot="Your active English" />
        <StatTile tone="blush" label="Due now" value="5" unit="phrases" foot="Quick refresh today" onPress={() => setF("Due now")} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 2, paddingTop: 10 }}>
        <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>History</Text>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3 }}>{list.length} PHRASES</Text>
      </View>

      {searching ? (
        <View
          style={[
            { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.colors.card, borderRadius: 9999, minHeight: 44, paddingHorizontal: 16, borderWidth: 0.5, borderColor: t.ring },
            t.shadowCard,
          ]}
        >
          <Icon name="search" s={17} c={t.colors.ink3} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Search your English — meaning, situation…"
            placeholderTextColor={t.colors.ink3}
            style={{ flex: 1, fontSize: 15, color: t.colors.ink }}
          />
          <Pressable
            onPress={() => {
              setQ("");
              setSearching(false);
            }}
            style={{ backgroundColor: t.colors.soft, borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="x" s={11} w={2.5} c={t.colors.ink3} />
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Pressable
            onPress={() => setSearching(true)}
            style={[{ backgroundColor: t.colors.card, borderRadius: 22, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: t.ring }, t.shadowCard]}
          >
            <Icon name="search" s={18} w={2} c={t.colors.ink2} />
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 18 }}>
            {FILTERS.map((x) => (
              <Chip key={x} active={f === x} onPress={() => setF(x)}>
                {x}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {list.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 34 }}>
          <Serif style={{ fontSize: 20, color: t.colors.ink }}>Nothing here yet</Serif>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center" }}>
            Try another word — or save something new from your Library.
          </Text>
        </Card>
      ) : null}

      {list.map((p) => (
        <Card key={p.id} onPress={() => nav.push("phrase", { id: p.id })}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", letterSpacing: -0.1, color: t.colors.ink }}>{p.txt}</Text>
              <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 3 }}>{p.ko}</Text>
            </View>
            <Badge s={p.status} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
            <Text style={{ fontSize: 12, color: t.colors.ink3, flex: 1 }}>
              {p.src} · {p.last}
            </Text>
            <Pill tone="tint" small icon="speaker">
              Hear
            </Pill>
            <Pill tone="soft" small onPress={() => nav.push("review", { id: p.id })}>
              Practice
            </Pill>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

// ── Phrase detail ───────────────────────────────────────────────────────────
export function PhraseDetail({ id, nav }: { id: number; nav: Nav }) {
  const t = useTheme();
  const p = SP.phrases.find((x) => x.id === id) ?? SP.phrases[0];
  const [use, setUse] = useState<string>(p.status);

  const opt = (label: string, desc: string, val: string) => (
    <Pressable
      onPress={() => setUse(val)}
      style={{ flexDirection: "row", gap: 11, alignItems: "flex-start", backgroundColor: use === val ? t.colors.accS : t.colors.soft, borderRadius: 16, padding: 12 }}
    >
      <View
        style={{ width: 20, height: 20, borderRadius: 10, marginTop: 1, backgroundColor: use === val ? t.colors.acc : t.colors.card, alignItems: "center", justifyContent: "center" }}
      >
        {use === val ? <Icon name="check" s={11} w={3} c="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: use === val ? t.colors.accD : t.colors.ink }}>{label}</Text>
        <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 2, lineHeight: 18 }}>{desc}</Text>
      </View>
    </Pressable>
  );

  const label = (s: string) => (
    <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>{s}</Text>
  );

  return (
    <Screen>
      <BackBar title="Phrase" onBack={nav.pop} right={<Pill tone="tint" small icon="dots" />} />
      <Card lg>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Serif style={{ fontSize: 28, color: t.colors.ink }}>{p.txt}</Serif>
            <Text style={{ fontSize: 15, color: t.colors.ink2, marginTop: 6 }}>{p.ko}</Text>
          </View>
          <Pressable style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
            <Icon name="speaker" s={20} c="#fff" />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          <Badge s={p.status} />
          {p.tags.map((tag) => (
            <View key={tag} style={{ backgroundColor: t.colors.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: t.colors.ink2, fontSize: 12, fontWeight: "600" }}>{tag}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        {label("WHERE YOU FOUND IT")}
        <Serif style={{ fontSize: 17, lineHeight: 25, marginTop: 8, fontStyle: "italic", color: t.colors.ink }}>{p.ctx}</Serif>
        <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 8 }}>
          Saved from “{p.src}” · {p.island} topic
        </Text>
      </Card>

      <Card>
        {label("WHY IT WORKS THIS WAY")}
        <Text style={{ fontSize: 15, lineHeight: 24, marginTop: 8, color: t.colors.ink2 }}>{p.why}</Text>
      </Card>

      <Card>
        {label("IN YOUR SITUATION")}
        <View style={{ gap: 8, marginTop: 10 }}>
          {p.mine.map((m, i) => (
            <View key={i} style={{ backgroundColor: t.colors.soft, borderRadius: 16, padding: 12 }}>
              <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink }}>{m}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 15, fontWeight: "700", marginBottom: 10, color: t.colors.ink }}>Can you use it right now?</Text>
        <View style={{ gap: 8 }}>
          {opt("I only recognized it", "I knew the meaning, but couldn’t say it on my own.", "Recognizing")}
          {opt("I used it with help", "With a hint or example, I could use it.", "Practicing")}
          {opt("I used it on my own", "No hints — it showed up in my answer.", "Ready to use")}
        </View>
      </Card>

      <Pill full icon="mic" onPress={() => nav.push("review", { id: p.id })}>
        Practice in context
      </Pill>
      <Row>
        <Pill tone="tint" full small icon="pen">
          Add note
        </Pill>
        <Pill tone="tint" full small icon="map">
          Move island
        </Pill>
        <Pill tone="tint" full small>
          Archive
        </Pill>
      </Row>
      <Text style={{ fontSize: 13, color: t.colors.ink3, textAlign: "center", paddingVertical: 4 }}>
        Next review: in 3 days · related — {p.rel.join(" · ")}
      </Text>
    </Screen>
  );
}

// ── Review flow ─────────────────────────────────────────────────────────────
export function ReviewFlow({ id, nav }: { id: number; nav: Nav }) {
  const t = useTheme();
  const p: Phrase = SP.phrases.find((x) => x.id === id) ?? SP.phrases[0];
  const [st, setSt] = useState(0); // 0 listen 1 recall 2 blank 3 say 4 done
  const [reveal, setReveal] = useState(false);
  const [rec, setRec] = useState(false);
  const steps = ["Listen", "Recall", "Fill it in", "Say it"];

  return (
    <Screen>
      <BackBar
        title="Bring it back"
        onBack={nav.pop}
        right={<Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3 }}>{Math.min(st + 1, 4)} / 4</Text>}
      />
      <View style={{ flexDirection: "row", gap: 5 }}>
        {steps.map((s, i) => (
          <View key={i} style={{ flex: 1, height: 5, borderRadius: 9999, backgroundColor: st >= i ? t.colors.acc : t.colors.soft }} />
        ))}
      </View>
      <Text style={{ fontSize: 13, color: t.colors.ink2, paddingHorizontal: 2, lineHeight: 20 }}>
        You saved this because it fit something you wanted to say.
      </Text>

      {st === 0 && (
        <>
          <Card lg style={{ alignItems: "center", paddingVertical: 34 }}>
            <Pressable style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
              <Icon name="speaker" s={26} c="#fff" />
            </Pressable>
            <Serif style={{ fontSize: 22, marginTop: 18, color: t.colors.ink }}>{p.txt}</Serif>
            <View style={{ marginTop: 14 }}>
              <Wave n={20} h={22} />
            </View>
          </Card>
          <Pill full onPress={() => setSt(1)}>
            I heard it
          </Pill>
        </>
      )}

      {st === 1 && (
        <>
          <Card lg style={{ alignItems: "center", paddingVertical: 30 }}>
            <Serif style={{ fontSize: 22, color: t.colors.ink }}>{p.txt}</Serif>
            <Text style={{ fontSize: 15, color: t.colors.ink2, marginTop: 12, textAlign: "center" }}>
              {reveal ? p.ko + " — " + p.mean : "What does it mean? When would you use it?"}
            </Text>
          </Card>
          {!reveal ? (
            <Pill tone="tint" full onPress={() => setReveal(true)}>
              Show meaning
            </Pill>
          ) : (
            <Pill
              full
              onPress={() => {
                setReveal(false);
                setSt(2);
              }}
            >
              I remembered
            </Pill>
          )}
        </>
      )}

      {st === 2 && (
        <>
          <Card lg>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>FILL THE GAP</Text>
            <Serif style={{ fontSize: 20, lineHeight: 30, marginTop: 10, color: t.colors.ink }}>
              “I finally decided to{" "}
              <Text style={{ backgroundColor: reveal ? t.colors.accS : t.colors.soft, color: reveal ? t.colors.accD : "transparent", borderRadius: 8, fontStyle: reveal ? "italic" : "normal" }}>
                {" " + p.txt + " "}
              </Text>{" "}
              and apply.”
            </Serif>
          </Card>
          {!reveal ? (
            <Pill tone="tint" full onPress={() => setReveal(true)}>
              Reveal
            </Pill>
          ) : (
            <Pill
              full
              onPress={() => {
                setReveal(false);
                setSt(3);
              }}
            >
              Got it
            </Pill>
          )}
        </>
      )}

      {st === 3 && (
        <>
          <Card lg>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>MAKE IT YOURS</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", lineHeight: 24, marginTop: 8, color: t.colors.ink }}>
              Say one sentence about your life using “{p.txt}”.
            </Text>
            {rec ? (
              <View style={{ marginTop: 14 }}>
                <Wave active n={24} h={24} />
              </View>
            ) : null}
          </Card>
          <View style={{ alignItems: "center", paddingVertical: 6 }}>
            <Pressable
              onPress={() => (rec ? setSt(4) : setRec(true))}
              style={[{ width: 74, height: 74, borderRadius: 37, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }, t.shadowCard]}
            >
              {rec ? <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: "#fff" }} /> : <Icon name="mic" s={30} c="#fff" />}
            </Pressable>
          </View>
          <Text style={{ fontSize: 13, color: t.colors.ink3, textAlign: "center" }}>{rec ? "Tap to finish" : "Tap to speak"}</Text>
        </>
      )}

      {st === 4 && (
        <>
          <Hero style={{ alignItems: "center", paddingVertical: 30 }}>
            <Serif style={{ fontSize: 22, lineHeight: 29, color: "#fff", textAlign: "center" }}>
              Nice. You brought one phrase closer to your active English.
            </Serif>
          </Hero>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{p.txt}</Text>
              <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>next review in 5 days</Text>
            </View>
            <Badge s="Practicing" />
          </Card>
          <Pill full onPress={nav.pop}>
            Done
          </Pill>
        </>
      )}
    </Screen>
  );
}
