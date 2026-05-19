"use client";

import Link from "next/link";
import { BackIcon, BookmarkIcon, EyeOffIcon } from "./Icons";

interface Props {
  title: string;
  folderName: string | null;
  showVideo: boolean;
  canHideVideo: boolean;
  onToggleVideo: () => void;
}

export default function ClipHeader({
  title,
  folderName,
  showVideo,
  canHideVideo,
  onToggleVideo,
}: Props) {
  return (
    <header className="clip-head">
      <div className="clip-head-inner">
        <Link href="/" className="back-btn" aria-label="Back to library">
          <BackIcon />
        </Link>
        <div className="clip-meta-col">
          <div className="clip-crumb">
            <Link href="/">Library</Link>
            {folderName ? <> · <span>{folderName}</span></> : null}
          </div>
          <div className="clip-title-row">
            <span className="clip-title">{title}</span>
          </div>
        </div>
        <div className="clip-actions">
          <Link href="/bookmarks" className="icon-btn">
            <BookmarkIcon />
            <span>Bookmarks</span>
          </Link>
          {canHideVideo && (
            <button
              type="button"
              className="icon-btn"
              onClick={onToggleVideo}
            >
              <EyeOffIcon />
              <span>{showVideo ? "Hide video" : "Show video"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
