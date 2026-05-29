"use client";

import type { MouseEvent } from "react";
import type { PracticeStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/components/home/StatusControl";
import { CheckIcon, CircleDashedIcon } from "@/components/home/Icons";

interface Props {
  status: PracticeStatus;
  onOpen: () => void;
}

export default function MobileStatusBadge({ status, onOpen }: Props) {
  const tap = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpen();
  };

  if (status === "focusing" || status === "done") {
    return (
      <button
        type="button"
        className={"status-pill " + status + " m-status-badge"}
        onClick={tap}
        aria-label="Change status"
      >
        {status === "focusing" ? (
          <span className="status-dot" aria-hidden="true" />
        ) : (
          <CheckIcon />
        )}
        <span>{STATUS_LABEL[status]}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="m-status-set"
      onClick={tap}
      aria-label="Set status"
    >
      <CircleDashedIcon />
    </button>
  );
}
