"use client";

import Link from "next/link";
import { HomeIcon, BookmarkIcon, PracticeIcon } from "./Icons";

export type MobileTab = "library" | "bookmarks" | "practice";

export default function MobileTabBar({ active }: { active: MobileTab }) {
  return (
    <nav className="m-tabbar" aria-label="Mobile navigation">
      <Link href="/" className={"m-tab" + (active === "library" ? " active" : "")}>
        <span className="m-tab-icon"><HomeIcon /></span>
        Library
      </Link>
      <Link href="/bookmarks" className={"m-tab" + (active === "bookmarks" ? " active" : "")}>
        <span className="m-tab-icon"><BookmarkIcon /></span>
        Bookmarks
      </Link>
      <Link href="/practice" className={"m-tab" + (active === "practice" ? " active" : "")}>
        <span className="m-tab-icon"><PracticeIcon /></span>
        Practice
      </Link>
    </nav>
  );
}
