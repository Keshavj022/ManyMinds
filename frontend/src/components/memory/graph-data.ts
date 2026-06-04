/**
 * Hand-positioned mock memory graph. Nodes positioned to form a clean web
 * shape (3 clusters, central spine). Each node belongs to one of the four
 * categories shown in the filter chips: People, Topics, Moments, Decisions.
 *
 * Champion = which council member surfaced/owns this node. Drives the node
 * color via that member's signature hue.
 */
import type { CouncilMemberId } from "@/lib/design-tokens";

export type NodeCategory = "People" | "Topics" | "Moments" | "Decisions";

export interface GraphNode {
  id: string;
  label: string;
  category: NodeCategory;
  /** [0..100] in the SVG viewBox. */
  x: number;
  y: number;
  radius: number;
  champion: CouncilMemberId;
  firstMentioned: string;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  connectedTopics: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number; // [0..1] visual intensity
}

export const GRAPH_NODES: ReadonlyArray<GraphNode> = [
  // central spine
  {
    id: "decentralized",
    label: "Decentralized systems",
    category: "Topics",
    x: 50,
    y: 50,
    radius: 7,
    champion: "sage",
    firstMentioned: "Oct 12, 2025",
    sentiment: "positive",
    sentimentScore: 0.82,
    connectedTopics: ["Blockchain", "Privacy", "Peer-to-peer", "Censorship"],
  },
  {
    id: "pivot",
    label: "The pivot question",
    category: "Decisions",
    x: 35,
    y: 35,
    radius: 6,
    champion: "aria",
    firstMentioned: "Nov 3, 2025",
    sentiment: "neutral",
    sentimentScore: 0.18,
    connectedTopics: ["Strategy", "Runway", "Enterprise", "Prosumer"],
  },
  {
    id: "trust",
    label: "Trust",
    category: "Topics",
    x: 68,
    y: 32,
    radius: 6,
    champion: "echo",
    firstMentioned: "Sep 20, 2025",
    sentiment: "positive",
    sentimentScore: 0.7,
    connectedTopics: ["Relationships", "Vulnerability", "Boundaries"],
  },
  // people cluster (left)
  {
    id: "marcus",
    label: "Marcus",
    category: "People",
    x: 18,
    y: 30,
    radius: 5,
    champion: "echo",
    firstMentioned: "Sep 4, 2025",
    sentiment: "positive",
    sentimentScore: 0.5,
    connectedTopics: ["Work", "Mentorship"],
  },
  {
    id: "sister",
    label: "Your sister",
    category: "People",
    x: 22,
    y: 60,
    radius: 5.5,
    champion: "echo",
    firstMentioned: "Aug 11, 2025",
    sentiment: "positive",
    sentimentScore: 0.88,
    connectedTopics: ["Family", "Childhood", "Holiday plans"],
  },
  {
    id: "boss",
    label: "Your boss",
    category: "People",
    x: 12,
    y: 48,
    radius: 4.5,
    champion: "rex",
    firstMentioned: "Sep 28, 2025",
    sentiment: "negative",
    sentimentScore: -0.32,
    connectedTopics: ["Work", "Conflict", "The pivot question"],
  },
  // topics
  {
    id: "creativity",
    label: "Creativity",
    category: "Topics",
    x: 60,
    y: 65,
    radius: 6,
    champion: "nova",
    firstMentioned: "Sep 1, 2025",
    sentiment: "positive",
    sentimentScore: 0.95,
    connectedTopics: ["Writing", "Music", "Saturday mornings"],
  },
  {
    id: "discipline",
    label: "Discipline",
    category: "Topics",
    x: 80,
    y: 55,
    radius: 5.5,
    champion: "aria",
    firstMentioned: "Oct 18, 2025",
    sentiment: "neutral",
    sentimentScore: 0.1,
    connectedTopics: ["Habits", "Goals", "Friction"],
  },
  {
    id: "solitude",
    label: "Solitude",
    category: "Topics",
    x: 86,
    y: 38,
    radius: 4.8,
    champion: "sage",
    firstMentioned: "Sep 14, 2025",
    sentiment: "positive",
    sentimentScore: 0.4,
    connectedTopics: ["Reading", "Long walks", "Evening light"],
  },
  // moments
  {
    id: "tuesday",
    label: "Tuesday evening",
    category: "Moments",
    x: 75,
    y: 75,
    radius: 5,
    champion: "echo",
    firstMentioned: "Nov 5, 2025",
    sentiment: "neutral",
    sentimentScore: 0.05,
    connectedTopics: ["Tone shift", "Reflective", "Quiet"],
  },
  {
    id: "laugh",
    label: "The argument-laugh",
    category: "Moments",
    x: 45,
    y: 78,
    radius: 4.5,
    champion: "rex",
    firstMentioned: "Oct 27, 2025",
    sentiment: "positive",
    sentimentScore: 0.88,
    connectedTopics: ["Debate", "Rex", "Almost-laugh"],
  },
  {
    id: "tears",
    label: "Late-night call",
    category: "Moments",
    x: 30,
    y: 80,
    radius: 4.5,
    champion: "echo",
    firstMentioned: "Oct 2, 2025",
    sentiment: "neutral",
    sentimentScore: -0.1,
    connectedTopics: ["Your sister", "Vulnerability"],
  },
  // decisions
  {
    id: "move",
    label: "The move",
    category: "Decisions",
    x: 62,
    y: 18,
    radius: 5.2,
    champion: "sage",
    firstMentioned: "Jul 14, 2025",
    sentiment: "positive",
    sentimentScore: 0.62,
    connectedTopics: ["City", "Apartment", "Risk"],
  },
  {
    id: "side-project",
    label: "Side project",
    category: "Decisions",
    x: 42,
    y: 20,
    radius: 5,
    champion: "nova",
    firstMentioned: "Sep 22, 2025",
    sentiment: "positive",
    sentimentScore: 0.78,
    connectedTopics: ["Creativity", "Weekends", "Discipline"],
  },
  {
    id: "boundaries",
    label: "Set a boundary",
    category: "Decisions",
    x: 88,
    y: 70,
    radius: 4.5,
    champion: "aria",
    firstMentioned: "Oct 30, 2025",
    sentiment: "positive",
    sentimentScore: 0.55,
    connectedTopics: ["Boss", "Work", "Discipline"],
  },
];

export const GRAPH_EDGES: ReadonlyArray<GraphEdge> = [
  { from: "decentralized", to: "pivot", weight: 0.65 },
  { from: "decentralized", to: "trust", weight: 0.8 },
  { from: "decentralized", to: "solitude", weight: 0.4 },
  { from: "decentralized", to: "creativity", weight: 0.45 },
  { from: "pivot", to: "boss", weight: 0.55 },
  { from: "pivot", to: "marcus", weight: 0.5 },
  { from: "pivot", to: "side-project", weight: 0.6 },
  { from: "trust", to: "sister", weight: 0.75 },
  { from: "trust", to: "tears", weight: 0.7 },
  { from: "trust", to: "marcus", weight: 0.4 },
  { from: "creativity", to: "side-project", weight: 0.85 },
  { from: "creativity", to: "laugh", weight: 0.5 },
  { from: "creativity", to: "nova-bridge", weight: 0 }, // edges with missing nodes filtered out
  { from: "discipline", to: "side-project", weight: 0.55 },
  { from: "discipline", to: "boundaries", weight: 0.6 },
  { from: "discipline", to: "solitude", weight: 0.5 },
  { from: "tuesday", to: "discipline", weight: 0.42 },
  { from: "tuesday", to: "trust", weight: 0.55 },
  { from: "laugh", to: "pivot", weight: 0.5 },
  { from: "sister", to: "tears", weight: 0.78 },
  { from: "boss", to: "boundaries", weight: 0.62 },
  { from: "marcus", to: "boundaries", weight: 0.32 },
  { from: "move", to: "trust", weight: 0.42 },
  { from: "move", to: "pivot", weight: 0.45 },
  { from: "solitude", to: "tuesday", weight: 0.5 },
];

export const NODE_CATEGORIES: ReadonlyArray<NodeCategory> = [
  "People",
  "Topics",
  "Moments",
  "Decisions",
];

export const CATEGORY_ICON: Record<NodeCategory, string> = {
  People: "person",
  Topics: "label",
  Moments: "stars",
  Decisions: "flag",
};
