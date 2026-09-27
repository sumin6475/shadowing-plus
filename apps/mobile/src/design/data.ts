// data.ts — sample content ported verbatim from the prototype (sp-theme.jsx
// `SP`). Mock data only; no network. The real app will source these from the
// Supabase anon client + web API.
import type { IconName } from "./icon";

export type Status = "New" | "Recognizing" | "Practicing" | "Ready to use" | "Needs refresh";

export interface Phrase {
  id: number;
  txt: string;
  ko: string;
  mean: string;
  tags: string[];
  status: Status;
  src: string;
  last: string;
  island: string;
  ctx: string;
  why: string;
  mine: string[];
  rel: string[];
}

export interface Island {
  id: string;
  name: string;
  ph: number;
  tries: number;
  ready: number;
  state: string;
  tone: "butter" | "sky" | "sage" | "blush";
  can: string[];
  worth: string[];
  qs: string[];
}

export interface LibItem {
  id: number;
  type: string;
  icon: IconName;
  title: string;
  meta: string;
  state: string;
  prog?: number;
  tone: "butter" | "sky" | "sage" | "blush";
}

export const SP: {
  phrases: Phrase[];
  islands: Island[];
  lib: LibItem[];
  prompts: string[];
} = {
  phrases: [
    { id: 1, txt: "take the plunge", ko: "망설이다가 큰맘 먹고 실행하다", mean: "finally do something you’d been hesitating about", tags: ["Daily life", "Decisions"], status: "Needs refresh", src: "Sunglasses story", last: "8 days ago", island: "Daily life", ctx: "“I’ll take the plunge and buy a nice pair of sunglasses.”", why: "plunge is the feeling of diving into water — used when a decision involves money, risk, or change.", mine: ["I might take the plunge and apply for the program.", "I’m not ready yet, but I may take the plunge next year."], rel: ["sporting some cool specs", "play it safe"] },
    { id: 2, txt: "come across as", ko: "~한 인상을 주다", mean: "seem a certain way to other people", tags: ["Interviews"], status: "Recognizing", src: "Interview tips", last: "12 days ago", island: "Work & projects", ctx: "“You don’t want to come across as arrogant.”", why: "literally “cross over to” someone — how your manner travels to the listener.", mine: ["I hope I come across as genuinely curious."], rel: ["give the impression", "strike someone as"] },
    { id: 3, txt: "I’m especially interested in…", ko: "특히 ~에 관심이 있다", mean: "point at the part you care about most", tags: ["Self-intro"], status: "Ready to use", src: "Added by me", last: "3 days ago", island: "What I do", ctx: "“I’m especially interested in how people actually use what they learn.”", why: "a soft spotlight — narrows a broad topic to your angle.", mine: ["I’m especially interested in early-stage products."], rel: ["what draws me is…"] },
    { id: 4, txt: "What I’m trying to do is…", ko: "내가 하려는 것은 ~이다", mean: "frame your goal before the details", tags: ["Explaining"], status: "Ready to use", src: "Podcast — makers", last: "2 days ago", island: "What I do", ctx: "“What I’m trying to do is make practice feel personal.”", why: "buys you a beat to organize the sentence that follows.", mine: ["What I’m trying to do is keep it simple."], rel: ["the goal is to…"] },
    { id: 5, txt: "The part I care most about is…", ko: "내가 가장 신경 쓰는 부분은", mean: "signal your priority", tags: ["Explaining"], status: "Practicing", src: "Added by me", last: "5 days ago", island: "What I do", ctx: "“The part I care most about is the first minute of the experience.”", why: "moves a list of features into a personal statement.", mine: ["The part I care most about is trust."], rel: ["what matters most is…"] },
    { id: 6, txt: "I’ve been working on…", ko: "요즘 ~을 하고 있다", mean: "describe an ongoing project naturally", tags: ["Self-intro"], status: "Ready to use", src: "Interview tips", last: "yesterday", island: "What I do", ctx: "“I’ve been working on a speaking app for learners like me.”", why: "present perfect keeps it alive — started before, still happening.", mine: ["I’ve been working on my portfolio."], rel: ["I’m in the middle of…"] },
    { id: 7, txt: "play it safe", ko: "안전하게 가다", mean: "avoid risk on purpose", tags: ["Decisions"], status: "Recognizing", src: "Sunglasses story", last: "8 days ago", island: "Daily life", ctx: "“I always play it safe with cheap sunglasses.”", why: "from games — choose the move that can’t lose.", mine: ["This time I don’t want to play it safe."], rel: ["take the plunge"] },
    { id: 8, txt: "get this issue under control", ko: "문제를 수습하다", mean: "stop a problem from growing", tags: ["Work"], status: "New", src: "Team call clip", last: "today", island: "Work & projects", ctx: "“We need to get this issue under control first.”", why: "control as a place — you bring the problem “under” it.", mine: ["Let’s get the scope under control before adding more."], rel: ["sort it out"] },
  ],
  islands: [
    { id: "what", name: "What I do", ph: 8, tries: 4, ready: 2, state: "Growing", tone: "butter", can: ["what you’re building", "who it helps"], worth: ["why this problem matters to you"], qs: ["What are you working on?", "Why did you start it?", "Who is it for?"] },
    { id: "about", name: "About me", ph: 6, tries: 3, ready: 2, state: "Ready to explore", tone: "sky", can: ["your background", "what you enjoy"], worth: ["a story that shows who you are"], qs: ["Tell me about yourself.", "What do you do outside work?"] },
    { id: "work", name: "Work & projects", ph: 5, tries: 2, ready: 1, state: "Growing", tone: "sage", can: ["your current project"], worth: ["a challenge you solved"], qs: ["Describe a challenge you faced.", "What did you learn from it?"] },
    { id: "daily", name: "Daily life", ph: 4, tries: 1, ready: 1, state: "Just started", tone: "blush", can: ["your routines"], worth: ["small decisions and trade-offs"], qs: ["What’s a small purchase you debated?"] },
    { id: "opin", name: "Opinions", ph: 2, tries: 0, ready: 0, state: "Just started", tone: "sky", can: [], worth: ["saying what you think, simply"], qs: ["What’s a popular opinion you disagree with?"] },
    { id: "future", name: "Future plans", ph: 3, tries: 1, ready: 0, state: "Needs a refresh", tone: "butter", can: ["your next step"], worth: ["why that step, why now"], qs: ["Where do you see this going?"] },
  ],
  lib: [
    { id: 1, type: "video", icon: "clip", title: "Sunglasses story", meta: "4:12 · 5 phrases saved", state: "Ready", tone: "butter" },
    { id: 2, type: "audio", icon: "wave2", title: "Podcast — makers on habits", meta: "18:40 · uploading you own audio", state: "Transcribing", prog: 0.62, tone: "sky" },
    { id: 3, type: "text", icon: "text", title: "Interview tips (pasted text)", meta: "6 phrases saved", state: "Ready", tone: "sage" },
    { id: 4, type: "phrases", icon: "bank", title: "Pasted from another app", meta: "6 phrases · needs topics", state: "Ready", tone: "blush" },
  ],
  prompts: ["Explain what I do", "Tell me about yourself", "What are you working on?", "Describe a challenge you faced", "Something I learned recently"],
};
