// onboarding.tsx — 6-step onboarding (sp-onboarding.jsx).
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/design/theme";
import { Block, Card, Header, Icon, Pill, Screen, Serif } from "@/design/ui";

function ObDots({ i, n = 6 }: { i: number; n?: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 5, justifyContent: "center", paddingVertical: 8 }}>
      {Array.from({ length: n }).map((_, k) => (
        <View key={k} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 9999, backgroundColor: k <= i ? t.colors.acc : t.colors.soft }} />
      ))}
    </View>
  );
}

function ObSkip({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={{ padding: 8 }}>
      <Text style={{ color: t.colors.ink3, fontSize: 15, fontWeight: "600" }}>Skip</Text>
    </Pressable>
  );
}

function ObOption({ x, on, set }: { x: string; on: boolean; set: (v: string) => void }) {
  const t = useTheme();
  return (
    <Card onPress={() => set(x)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 15, borderWidth: on ? 2.5 : 0.5, borderColor: on ? t.colors.acc : t.ring }}>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: on ? t.colors.accD : t.colors.ink }}>{x}</Text>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: on ? t.colors.acc : t.colors.soft, alignItems: "center", justifyContent: "center" }}>
        {on ? <Icon name="check" s={13} w={3} c="#fff" /> : null}
      </View>
    </Card>
  );
}

export function Onboarding({ done }: { done: () => void }) {
  const t = useTheme();
  const [st, setSt] = useState(0);
  const [goal, setGoal] = useState("Explain what I do");
  const [feel, setFeel] = useState(0);
  const [topic, setTopic] = useState("What I do");
  const [mins, setMins] = useState("5 minutes a day");

  const goals = ["Explain what I do", "Speak more naturally in daily life", "Prepare for interviews", "Share opinions with confidence", "Travel and meet new people", "Something else"];
  const feels = ["I understand English, but freeze when I speak.", "I know phrases, but can’t use them naturally.", "I can speak, but want to sound clearer.", "I want a consistent practice habit."];
  const topics = ["Who I am", "What I do", "My work or studies", "My interests", "A recent challenge", "My future plans"];

  return (
    <Screen bottomPad={30}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 40 }}>
        {st > 0 ? (
          <Pressable
            onPress={() => setSt(st - 1)}
            style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.card, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: t.ring }, t.shadowCard]}
          >
            <Icon name="back" s={17} w={2.2} c={t.colors.ink} />
          </Pressable>
        ) : (
          <View />
        )}
        {st > 0 ? <ObSkip onPress={done} /> : null}
      </View>

      {st === 0 && (
        <>
          <View style={{ flex: 1, justifyContent: "center", gap: 18, alignItems: "center", paddingHorizontal: 6, paddingVertical: 40 }}>
            <View style={[{ width: 74, height: 74, borderRadius: 17, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }, t.shadowCard]}>
              <Icon name="mic" s={34} c="#fff" />
            </View>
            <Serif style={{ fontSize: 34, lineHeight: 37, textAlign: "center", color: t.colors.ink }}>Make English{"\n"}yours.</Serif>
            <Text style={{ fontSize: 17, color: t.colors.ink2, lineHeight: 26, textAlign: "center" }}>Learn from anywhere. Bring it back when you need to speak.</Text>
            <Text style={{ fontSize: 13, color: t.colors.ink3, lineHeight: 21, textAlign: "center" }}>
              Shadowing Plus turns English you recognize into English you can actually use.
            </Text>
          </View>
          <Pill full onPress={() => setSt(1)}>
            Get started
          </Pill>
          <Pill tone="ghost" full small onPress={done}>
            I already have an account
          </Pill>
        </>
      )}

      {st === 1 && (
        <>
          <ObDots i={0} />
          <Header title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>What do you want{"\n"}English to help you do?</Serif>} />
          {goals.map((g) => (
            <ObOption key={g} x={g} on={goal === g} set={setGoal} />
          ))}
          <Pill full onPress={() => setSt(2)} style={{ marginTop: 6 }}>
            Continue
          </Pill>
        </>
      )}

      {st === 2 && (
        <>
          <ObDots i={1} />
          <Header
            title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>Which feels{"\n"}most like you?</Serif>}
            sub="Not a level test — just so your first practice fits."
          />
          {feels.map((f, i) => (
            <ObOption key={i} x={f} on={feel === i} set={() => setFeel(i)} />
          ))}
          <Pill full onPress={() => setSt(3)} style={{ marginTop: 6 }}>
            Continue
          </Pill>
        </>
      )}

      {st === 3 && (
        <>
          <ObDots i={2} />
          <Header title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>Knowing a phrase is{"\n"}only the beginning.</Serif>} />
          <View style={{ height: 250, marginVertical: 6 }}>
            <View style={{ position: "absolute", left: 8, top: 20, width: 200, height: 200, borderRadius: 100, backgroundColor: t.colors.sky, alignItems: "center", justifyContent: "center" }}>
              <View style={{ alignItems: "center", transform: [{ translateX: -26 }] }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: t.colors.onB }}>I recognize it</Text>
                <Text style={{ fontSize: 12, color: t.colors.onB2, marginTop: 3, lineHeight: 17, textAlign: "center" }}>I understand it when{"\n"}I hear or read it</Text>
              </View>
            </View>
            <View style={{ position: "absolute", right: 8, top: 20, width: 200, height: 200, borderRadius: 100, backgroundColor: t.colors.butter, alignItems: "center", justifyContent: "center" }}>
              <View style={{ alignItems: "center", transform: [{ translateX: 26 }] }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: t.colors.onB }}>I can use it</Text>
                <Text style={{ fontSize: 12, color: t.colors.onB2, marginTop: 3, lineHeight: 17, textAlign: "center" }}>I can say it in{"\n"}my own situation</Text>
              </View>
            </View>
            <View style={{ position: "absolute", left: 0, right: 0, top: 108, alignItems: "center", zIndex: 2 }}>
              <View style={[{ backgroundColor: t.colors.card, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 }, t.shadowCard]}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: t.colors.accD }}>my usable English</Text>
              </View>
            </View>
          </View>
          <Text style={{ fontSize: 15, color: t.colors.ink2, lineHeight: 24, textAlign: "center", paddingHorizontal: 10 }}>
            We help you move phrases from <Text style={{ color: t.colors.ink, fontWeight: "700" }}>recognition</Text> to{" "}
            <Text style={{ color: t.colors.accD, fontWeight: "700" }}>real use</Text>.
          </Text>
          <Pill full onPress={() => setSt(4)} style={{ marginTop: 6 }}>
            Show me how
          </Pill>
        </>
      )}

      {st === 4 && (
        <>
          <ObDots i={3} />
          <Header
            title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>Start with one topic{"\n"}you want to speak about.</Serif>}
            sub="You don’t need a polished answer. Start with the messy version in your head."
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.gap }}>
            {topics.map((tp, i) => (
              <Block
                key={tp}
                tone={["butter", "sky", "sage", "blush", "sky", "butter"][i]}
                onPress={() => setTopic(tp)}
                style={{ width: "47%", flexGrow: 1, minHeight: 84, justifyContent: "space-between", borderWidth: topic === tp ? 2.5 : 0.5, borderColor: topic === tp ? t.colors.acc : t.ring }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.onB }}>{tp}</Text>
                {topic === tp ? (
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" }}>
                    <Icon name="check" s={12} w={3} c="#fff" />
                  </View>
                ) : null}
              </Block>
            ))}
          </View>
          <Pill full onPress={() => setSt(5)} style={{ marginTop: 6 }}>
            Continue
          </Pill>
        </>
      )}

      {st === 5 && (
        <>
          <ObDots i={4} />
          <Header
            title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>What kind of practice{"\n"}feels realistic?</Serif>}
            sub="Start small. A short practice you repeat beats a perfect plan you skip."
          />
          {["3 minutes a day", "5 minutes a day", "10 minutes a day", "I’ll decide each day"].map((m) => (
            <ObOption key={m} x={m} on={mins === m} set={setMins} />
          ))}
          <Card style={{ backgroundColor: t.colors.accS, shadowOpacity: 0, borderWidth: 0 }}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 16, backgroundColor: t.colors.card, alignItems: "center", justifyContent: "center" }}>
                <Icon name="bell" s={19} c={t.colors.accD} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: t.colors.accD, fontWeight: "600", lineHeight: 19 }}>
                Want a gentle reminder when your English is ready to use again?
              </Text>
            </View>
          </Card>
          <Pill full onPress={done}>
            Enable reminders & start
          </Pill>
          <Pill tone="ghost" full small onPress={done}>
            Not now
          </Pill>
        </>
      )}
    </Screen>
  );
}
