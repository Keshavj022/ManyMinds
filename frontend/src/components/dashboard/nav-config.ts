/**
 * Shared nav configuration — Sidebar, Header, and mobile tab bar all read from here.
 * Each nav item is mapped to a council member's signature color so the shell
 * itself feels like the council is present (e.g. Aria owns the chat row).
 */
import type { CouncilMemberId } from "@/lib/design-tokens";

export interface NavItem {
  name: string;
  shortName: string; // for the mobile tab bar
  href: string;
  icon: string; // material-symbols
  member: CouncilMemberId;
  /** Optional subtitle hint shown in the Header when this route is active. */
  hint: string;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  {
    name: "Dashboard",
    shortName: "Home",
    href: "/dashboard",
    icon: "sensors",
    member: "sage",
    hint: "The council is here. Pick a thread.",
  },
  {
    name: "Council Chat",
    shortName: "Chat",
    href: "/chat",
    icon: "forum",
    member: "aria",
    hint: "Five voices, one room.",
  },
  {
    name: "Debate Arena",
    shortName: "Debate",
    href: "/debate",
    icon: "balance",
    member: "rex",
    hint: "Pick a side or let them clash.",
  },
  {
    name: "Games Hub",
    shortName: "Games",
    href: "/games",
    icon: "extension",
    member: "nova",
    hint: "Play with the council, not against them.",
  },
  {
    name: "Council Config",
    shortName: "Tune",
    href: "/config",
    icon: "tune",
    member: "sage",
    hint: "Fine-tune how each friend speaks.",
  },
  {
    name: "Your Profile",
    shortName: "You",
    href: "/profile",
    icon: "account_circle",
    member: "echo",
    hint: "You, and everything they remember.",
  },
];

/** Resolve the nav item whose href best matches the current pathname. */
export function resolveActiveNav(pathname: string | null | undefined): NavItem {
  if (!pathname) return NAV_ITEMS[0];
  // Exact match first, then "startsWith" fallback so /dashboard/anything still works.
  const exact = NAV_ITEMS.find((item) => item.href === pathname);
  if (exact) return exact;
  const starts = NAV_ITEMS.find(
    (item) => pathname.startsWith(item.href + "/") || pathname.startsWith(item.href),
  );
  return starts ?? NAV_ITEMS[0];
}
