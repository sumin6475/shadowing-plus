"use client";

import Link from "next/link";
import { HomeIcon, BookmarkIcon, PracticeIcon } from "./Icons";

export type MobileTab = "library" | "bookmarks" | "practice";

export default function MobileTabBar({ active }: { active: MobileTab }) {
  // prefetch={false}: this tab bar lives inside the `.m-app` shell, which is
  // display:none on desktop. Left to default, Next still prefetches every tab's
  // route CSS (e.g. practice.css) on the library page, which the page never
  // uses — Chrome logs "preloaded ... but not used". Tab nav is a deliberate
  // tap, so fetch-on-click is fine.
  return (
    <nav className="m-tabbar" aria-label="Mobile navigation">
      <Link href="/" prefetch={false} className={"m-tab" + (active === "library" ? " active" : "")}>
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
    </nav>
  );
}
