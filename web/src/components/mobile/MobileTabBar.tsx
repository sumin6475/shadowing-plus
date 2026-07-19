"use client";

import { useState } from "react";
import Link from "next/link";
import { HomeIcon, BookmarkIcon, PracticeIcon, GearIcon } from "./Icons";
import SettingsModal from "@/components/settings/SettingsModal";

export type MobileTab = "library" | "bookmarks" | "practice" | "settings";

export default function MobileTabBar({ active }: { active: MobileTab }) {
  // Settings is now a modal (not a route). The last tab opens it directly —
  // the modal's Profile tab holds sign-out. prefetch={false}: this bar lives in
  // the display:none-on-desktop `.m-app` shell, so default prefetching pulls
  // route CSS the desktop page never uses.
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <nav className="m-tabbar" aria-label="Mobile navigation">
        <Link href="/app" prefetch={false} className={"m-tab" + (active === "library" ? " active" : "")}>
          <span className="m-tab-icon"><HomeIcon /></span>
          Library
        </Link>
        <Link href="/bookmarks" prefetch={false} className={"m-tab" + (active === "bookmarks" ? " active" : "")}>
          <span className="m-tab-icon"><BookmarkIcon /></span>
          Bookmarks
        </Link>
        <Link href="/practice" prefetch={false} className={"m-tab" + (active === "practice" ? " active" : "")}>
          <span className="m-tab-icon"><PracticeIcon /></span>
          Practice
        </Link>
        <button
          type="button"
          className={"m-tab m-tab-btn" + (settingsOpen ? " active" : "")}
          onClick={() => setSettingsOpen(true)}
        >
          <span className="m-tab-icon"><GearIcon /></span>
          Settings
        </button>
      </nav>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
