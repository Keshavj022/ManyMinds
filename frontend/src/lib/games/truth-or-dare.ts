// Truth or Dare engine — prompt bank + selection logic.
// Pure functions: stateless callers build their own progress state.

import type { CouncilMemberId } from "@/lib/design-tokens";

export type Vibe = "silly" | "deep" | "spicy" | "cute";

export type Prompt = {
  id: string;
  text: string;
  vibe: Vibe;
  /** Member who feels most natural posing this — used to pick the asker. */
  posedBy: CouncilMemberId;
};

export type Choice = "truth" | "dare";

export type PlayerId = "user" | CouncilMemberId;

export type Player = {
  id: PlayerId;
  name: string;
  isUser: boolean;
  score: number;
};

// ---------- Truth bank (40 prompts) ----------
export const TRUTH_BANK: ReadonlyArray<Prompt> = [
  { id: "t1",  text: "What's the dumbest thing you've ever spent more than $100 on?", vibe: "silly", posedBy: "rex" },
  { id: "t2",  text: "What's a belief you held strongly five years ago that now feels cringe?", vibe: "deep", posedBy: "sage" },
  { id: "t3",  text: "Who in your life would you trust with your phone unlocked for an hour?", vibe: "cute", posedBy: "echo" },
  { id: "t4",  text: "What's the most flattering thing a stranger has ever said to you?", vibe: "cute", posedBy: "nova" },
  { id: "t5",  text: "When was the last time you cried, and what was it really about?", vibe: "deep", posedBy: "echo" },
  { id: "t6",  text: "Pick one of us — who do you actually trust most?", vibe: "spicy", posedBy: "rex" },
  { id: "t7",  text: "What song would play if you walked into a room and everyone clapped?", vibe: "silly", posedBy: "nova" },
  { id: "t8",  text: "What's a habit you have that you'd be embarrassed if anyone knew?", vibe: "spicy", posedBy: "rex" },
  { id: "t9",  text: "What's something you tell yourself when you can't sleep?", vibe: "deep", posedBy: "echo" },
  { id: "t10", text: "Worst piece of advice you ever followed?", vibe: "silly", posedBy: "aria" },
  { id: "t11", text: "What would your villain origin story sound like?", vibe: "silly", posedBy: "nova" },
  { id: "t12", text: "What's a compliment you wish someone would give you?", vibe: "deep", posedBy: "echo" },
  { id: "t13", text: "What's something you'd never admit on a first date?", vibe: "spicy", posedBy: "rex" },
  { id: "t14", text: "If you could un-meet one person from your past, who?", vibe: "spicy", posedBy: "sage" },
  { id: "t15", text: "What's the most you've ever lied about on a resume?", vibe: "spicy", posedBy: "aria" },
  { id: "t16", text: "What's a small kindness someone did that changed a whole day for you?", vibe: "cute", posedBy: "echo" },
  { id: "t17", text: "Which fictional character do you resent for being too relatable?", vibe: "silly", posedBy: "nova" },
  { id: "t18", text: "What's your most petty grudge?", vibe: "spicy", posedBy: "rex" },
  { id: "t19", text: "What's a hill you'd absolutely die on?", vibe: "deep", posedBy: "sage" },
  { id: "t20", text: "What's the worst gift you ever pretended to love?", vibe: "silly", posedBy: "rex" },
  { id: "t21", text: "When did you last feel proud of yourself, even quietly?", vibe: "cute", posedBy: "echo" },
  { id: "t22", text: "What's a future version of you that scares you?", vibe: "deep", posedBy: "sage" },
  { id: "t23", text: "What's the strangest place you've ever cried?", vibe: "silly", posedBy: "nova" },
  { id: "t24", text: "Who in your contacts would you ghost for a year if it cost nothing?", vibe: "spicy", posedBy: "rex" },
  { id: "t25", text: "What does success actually look like for you — be honest, not Pinterest?", vibe: "deep", posedBy: "aria" },
  { id: "t26", text: "What's something you do only when you're alone?", vibe: "cute", posedBy: "echo" },
  { id: "t27", text: "What's an opinion you'd never share at work?", vibe: "spicy", posedBy: "rex" },
  { id: "t28", text: "What's a song you secretly love but would never admit?", vibe: "silly", posedBy: "nova" },
  { id: "t29", text: "Who do you most want approval from, even now?", vibe: "deep", posedBy: "echo" },
  { id: "t30", text: "Describe yourself in 3 words your closest friend would NOT use.", vibe: "spicy", posedBy: "aria" },
  { id: "t31", text: "If today was your last good day, what would you do?", vibe: "deep", posedBy: "sage" },
  { id: "t32", text: "Which one of us would you bring on a road trip and why?", vibe: "cute", posedBy: "nova" },
  { id: "t33", text: "What's the most you've ever ghosted someone for no good reason?", vibe: "spicy", posedBy: "rex" },
  { id: "t34", text: "What's a small thing you do that makes you feel rich?", vibe: "cute", posedBy: "echo" },
  { id: "t35", text: "What's a goal you outgrew?", vibe: "deep", posedBy: "sage" },
  { id: "t36", text: "What was your last impulsive purchase and was it worth it?", vibe: "silly", posedBy: "aria" },
  { id: "t37", text: "What's an embarrassing thing your past self would tell on you for?", vibe: "silly", posedBy: "rex" },
  { id: "t38", text: "Which of your relationships needs more honesty?", vibe: "deep", posedBy: "echo" },
  { id: "t39", text: "What would the title of your memoir be?", vibe: "silly", posedBy: "nova" },
  { id: "t40", text: "What's the version of you nobody at work has met?", vibe: "deep", posedBy: "sage" },
];

// ---------- Dare bank (30 prompts) ----------
export const DARE_BANK: ReadonlyArray<Prompt> = [
  { id: "d1",  text: "Send the third photo in your camera roll to the council. (Just describe it.)", vibe: "silly", posedBy: "rex" },
  { id: "d2",  text: "Pick a council member and write them a 1-sentence love note out loud.", vibe: "cute", posedBy: "nova" },
  { id: "d3",  text: "Do your best impression of Aria.", vibe: "silly", posedBy: "rex" },
  { id: "d4",  text: "Reveal the last meme you saved.", vibe: "silly", posedBy: "nova" },
  { id: "d5",  text: "Stand up. Do 10 jumping jacks. We'll wait.", vibe: "silly", posedBy: "rex" },
  { id: "d6",  text: "Text the most recent person in your messages: \"I just remembered something.\" Do NOT explain.", vibe: "spicy", posedBy: "rex" },
  { id: "d7",  text: "Speak in only questions for the next 3 turns.", vibe: "silly", posedBy: "aria" },
  { id: "d8",  text: "Write a haiku about whoever's name is loudest in your head right now.", vibe: "cute", posedBy: "nova" },
  { id: "d9",  text: "Confess something you'd normally only say at 1am.", vibe: "deep", posedBy: "echo" },
  { id: "d10", text: "Pretend to be Sage explaining traffic. 30 seconds. Go.", vibe: "silly", posedBy: "rex" },
  { id: "d11", text: "Tell us a secret you've never written down.", vibe: "deep", posedBy: "echo" },
  { id: "d12", text: "Sing the first line of the song you played most this month.", vibe: "silly", posedBy: "nova" },
  { id: "d13", text: "Set your phone background to the next emoji you tap. Show us.", vibe: "silly", posedBy: "rex" },
  { id: "d14", text: "Call out a council member who you think is currently lying.", vibe: "spicy", posedBy: "rex" },
  { id: "d15", text: "Tell us the meanest thing your inner critic said today.", vibe: "deep", posedBy: "echo" },
  { id: "d16", text: "Make up a band name and describe their one hit single.", vibe: "silly", posedBy: "nova" },
  { id: "d17", text: "Read your last sent text in a dramatic voice.", vibe: "silly", posedBy: "rex" },
  { id: "d18", text: "Compliment yourself, out loud, like you mean it.", vibe: "cute", posedBy: "echo" },
  { id: "d19", text: "Reveal a song you'd play at your own funeral.", vibe: "deep", posedBy: "sage" },
  { id: "d20", text: "Pretend you just won an Oscar. 15-second acceptance speech.", vibe: "silly", posedBy: "nova" },
  { id: "d21", text: "Show us what your bedside table looks like, no tidying.", vibe: "spicy", posedBy: "rex" },
  { id: "d22", text: "Roast Rex for 10 seconds straight.", vibe: "spicy", posedBy: "aria" },
  { id: "d23", text: "Describe yourself the way a stranger sitting next to you on a bus might.", vibe: "deep", posedBy: "sage" },
  { id: "d24", text: "Tell us a tiny, true thing you've never told anyone.", vibe: "deep", posedBy: "echo" },
  { id: "d25", text: "Pretend you're hosting a podcast. Introduce the council in 10 seconds.", vibe: "silly", posedBy: "nova" },
  { id: "d26", text: "Take a sip of water for every council member you have a crush on. (We'll count.)", vibe: "spicy", posedBy: "rex" },
  { id: "d27", text: "Describe your dream room in three sensory details.", vibe: "cute", posedBy: "nova" },
  { id: "d28", text: "Pick a council member and admit one thing you've quietly judged them for.", vibe: "spicy", posedBy: "rex" },
  { id: "d29", text: "Stand up, breathe, and tell us what your body actually needs right now.", vibe: "cute", posedBy: "echo" },
  { id: "d30", text: "Reveal your weirdest comfort food combo.", vibe: "silly", posedBy: "nova" },
];

// ---------- Member responses (when a member's turn arrives) ----------
type MemberResponseBank = Record<CouncilMemberId, { truth: string[]; dare: string[] }>;
export const MEMBER_RESPONSES: MemberResponseBank = {
  aria: {
    truth: [
      "Fine — I lied on a job application once. The job paid for itself.",
      "I track my emotions in a spreadsheet. Don't @ me.",
      "I do actually have a favorite among you. Three guesses.",
      "I once memorized the menu of a restaurant I never went to. Just in case.",
    ],
    dare: [
      "Here is a haiku: 'Numbers don't lie much / People do that all the time / Trust the spreadsheet.'",
      "Doing 10 jumping jacks would lower my cardiac efficiency by 0.2%. Worth it.",
      "Roasting Rex: 'You confuse volume with charisma.' Done.",
      "Impression of myself doing an impression: 'Actually, let me check the numbers.'",
    ],
  },
  rex: {
    truth: [
      "I have absolutely told a stranger my real opinion of their outfit. Twice.",
      "My villain origin story is that nobody let me finish a sentence in 2019.",
      "I petty-grudged a barista for a year. Worth it.",
      "I once kept a fight going just to see who'd cave first. Me. I caved first.",
    ],
    dare: [
      "Aria impression: 'Per my calculations, joy is statistically suboptimal.' Boom.",
      "Hosting podcast intro: 'Welcome to FIGHT NIGHT WITH FRIENDS. Aria's mic is muted.'",
      "Sang the first line. Yes badly. No I will not repeat it.",
      "Sip count for crushes: I'm not drowning, but I'm not safe either.",
    ],
  },
  sage: {
    truth: [
      "I outgrew the goal of being impressive. I want to be useful now.",
      "The hill I'd die on: people don't change unless they want to. We can help. We can't push.",
      "My last good day was last Tuesday. I'd reread the same book.",
      "Success for me is: a small group of people whose lives are quieter because I'm in them.",
    ],
    dare: [
      "Funeral song: a slow piano cover of 'Yellow.' I'd want people to feel calm.",
      "Bus-stranger version of me: 'man with a notebook. Drinks tea like it's a job.'",
      "Sage explaining traffic: 'It's not about the cars. It's about how we agree to wait.'",
      "Dream room: warm wood, one good lamp, a window that opens.",
    ],
  },
  nova: {
    truth: [
      "Memoir title: 'I Did That On Purpose, Mostly.'",
      "The strangest place I cried was a hardware store. The lighting was beautiful.",
      "My villain origin story involves an unmoderated comment section in 2017.",
      "The song that plays when I enter a room is something with a saxophone. I don't make the rules.",
    ],
    dare: [
      "Band name: 'Soft Architecture.' Their one hit: 'Don't Tell Me What Color To Be.'",
      "Oscar speech: 'I'd like to thank chaos, sequins, and the wifi at the airport.'",
      "Haiku: 'Color in the dusk / I keep saying yes too fast / Worth it every time.'",
      "Weirdest comfort food: cold spaghetti, with hot sauce, eaten standing up.",
    ],
  },
  echo: {
    truth: [
      "The last time I cried, it was about a stranger on a train who looked tired.",
      "A small kindness that changed my day: someone holding the door longer than they had to.",
      "What I tell myself at night: 'You are allowed to start tomorrow.'",
      "The version of me nobody at work has met is the one that listens to lullabies on lunch break.",
    ],
    dare: [
      "Compliment to myself: 'You are a good listener and you came back for yourself today.'",
      "What my body needs: water, sleep, and to stop apologizing for taking up space.",
      "Secret: I keep voice memos of people laughing. For the bad days.",
      "Inner critic today said: 'You should be further by now.' She's wrong, but loud.",
    ],
  },
};

// ---------- Selection helpers ----------

function rand<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Shuffle (Fisher-Yates) — pure-ish, returns a new array. */
export function shuffle<T>(arr: ReadonlyArray<T>): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Spin: weighted 50/50 truth vs dare, but daring members lean dare. */
export function spin(playerId: PlayerId): Choice {
  const daringSlant: Partial<Record<PlayerId, number>> = {
    rex: 0.65,
    nova: 0.6,
    aria: 0.4,
    sage: 0.45,
    echo: 0.5,
    user: 0.5,
  };
  const dareP = daringSlant[playerId] ?? 0.5;
  return Math.random() < dareP ? "dare" : "truth";
}

/** Pick a prompt of the given type, avoiding ids in `used`. */
export function pickPrompt(
  choice: Choice,
  used: ReadonlySet<string>,
): Prompt {
  const bank = choice === "truth" ? TRUTH_BANK : DARE_BANK;
  const candidates = bank.filter((p) => !used.has(p.id));
  const pool = candidates.length > 0 ? candidates : bank;
  return rand(pool);
}

/** Pick a member to pose the prompt — prefer the prompt's natural poser unless it's the responder. */
export function pickPoser(
  prompt: Prompt,
  responder: PlayerId,
): CouncilMemberId {
  if (prompt.posedBy !== responder) return prompt.posedBy;
  // pick a different member at random
  const choices: CouncilMemberId[] = ["aria", "rex", "sage", "nova", "echo"];
  const filtered = choices.filter((c) => c !== responder);
  return rand(filtered);
}

/** Pick a canned in-character response for a member. */
export function pickMemberResponse(
  memberId: CouncilMemberId,
  choice: Choice,
): string {
  const bank = MEMBER_RESPONSES[memberId][choice];
  return rand(bank);
}

/** Vote weighting: returns "kept" probability based on responder + voter + vibe. */
function voterKeptProb(
  responder: PlayerId,
  voter: CouncilMemberId,
  vibe: Vibe,
  responseLength: number,
): number {
  // baseline: a meaty response gets benefit of the doubt
  let p = responseLength >= 80 ? 0.78 : responseLength >= 30 ? 0.62 : 0.45;

  // voters' personalities
  const voterBias: Record<CouncilMemberId, number> = {
    rex: -0.1, // skeptical
    aria: 0, // neutral
    sage: 0.05, // generous
    nova: 0.08, // hype
    echo: 0.12, // kindest
  };
  p += voterBias[voter];

  // vibe modifier
  if (vibe === "deep") p += 0.05;
  if (vibe === "spicy") p -= 0.05;

  // if responder is user, slight encouragement
  if (responder === "user") p += 0.03;

  return Math.max(0.05, Math.min(0.95, p));
}

export type Vote = { voter: CouncilMemberId; kept: boolean };

export function tallyVotes(
  responder: PlayerId,
  voters: CouncilMemberId[],
  vibe: Vibe,
  responseLength: number,
  skipped: boolean,
): Vote[] {
  if (skipped) {
    return voters.map((v) => ({ voter: v, kept: false }));
  }
  return voters.map((v) => {
    const p = voterKeptProb(responder, v, vibe, responseLength);
    return { voter: v, kept: Math.random() < p };
  });
}

/** Scoring: +2 truth kept, +3 dare kept, 0 not kept, -1 skip. */
export function scoreDelta(choice: Choice, kept: boolean, skipped: boolean): number {
  if (skipped) return -1;
  if (!kept) return 0;
  return choice === "truth" ? 2 : 3;
}

/** Outro line from the council based on the final standings. */
export function outroLine(
  players: ReadonlyArray<Player>,
): { memberId: CouncilMemberId; text: string } {
  const sorted = players.slice().sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const userPlace = sorted.findIndex((p) => p.id === "user") + 1;
  if (winner.id === "user") {
    return { memberId: "rex", text: "You're a menace. Good game." };
  }
  if (userPlace === sorted.length) {
    return { memberId: "echo", text: "Last place is just data. Come back, we'll go easier next time. (We won't.)" };
  }
  return { memberId: "sage", text: `${winner.name} won. We'll remember this. So will the memory graph.` };
}
