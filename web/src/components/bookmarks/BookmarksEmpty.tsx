"use client";

import { BookmarkFillIcon } from "./Icons";

export default function BookmarksEmpty() {
  return (
    <div className="bm-empty">
      <div className="bm-empty-glyph">
        <BookmarkFillIcon />
      </div>
      <h2 className="bm-empty-title">No bookmarks yet</h2>
      <p className="bm-empty-sub">
        Save sentences you want to drill again. They&apos;ll show up here grouped by clip — perfect for a quick warm-up session.
      </p>
      <div className="bm-empty-hints">
        <span><b>B</b> Bookmark current line</span>
        <span><b>⇧ B</b> Open this page</span>
      </div>
    </div>
  );
}
