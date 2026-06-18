"use client";

import { useImperativeHandle, useRef, useState, forwardRef } from "react";
import { useUpload } from "@/lib/useUpload";
import { UploadIcon } from "./home/Icons";

export interface UploadDropzoneHandle {
  pick: () => void;
}

interface Props {
  onJobQueued: () => void;
}

const UploadDropzone = forwardRef<UploadDropzoneHandle, Props>(
  function UploadDropzone({ onJobQueued }, ref) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { handleFiles, uploading, error } = useUpload(onJobQueued);

    useImperativeHandle(ref, () => ({
      pick: () => inputRef.current?.click(),
    }));

    return (
      <div
        className={"dropzone" + (dragging ? " is-dragging" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="dropzone-icon">
          <UploadIcon />
        </div>
        <div className="dropzone-body">
          <div className="dropzone-title">
            {uploading
              ? "Uploading…"
              : dragging
                ? "Drop to upload"
                : "Drop a video or audio file, or click to choose"}
          </div>
          <div className="dropzone-sub">
            Title is taken from the filename — you can rename later.
          </div>
          {error && <div className="dropzone-error">{error}</div>}
        </div>
        <div className="dropzone-meta">
          <span className="dropzone-formats">MP4 · MP3 · WAV · M4A · MOV</span>
        </div>
      </div>
    );
  },
);

export default UploadDropzone;
