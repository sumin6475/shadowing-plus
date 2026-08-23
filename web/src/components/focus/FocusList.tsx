"use client";

import { useState, type FormEvent } from "react";
import "@/app/focus/focus.css";
import {
  WEAK_POINT_CATEGORIES,
  groupWeakPoints,
  type WeakPoint,
} from "@/lib/weak-points";

export interface FocusListActions {
  onAdd: (input: { text: string; category: string | null; starred?: boolean }) => Promise<unknown>;
  onUpdate: (
    id: string,
    patch: { text?: string; category?: string | null; completed?: boolean; starred?: boolean },
  ) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

interface Props extends FocusListActions {
  items: WeakPoint[];
  compact?: boolean;
  /** When true, new rows are starred (player sticky note). */
  starOnAdd?: boolean;
  emptyLabel?: string;
}

const CUSTOM = "__custom";

function CategoryField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
}) {
  const isSeeded = (WEAK_POINT_CATEGORIES as readonly string[]).includes(value);
  const [mode, setMode] = useState<"seed" | "custom">(
    value && !isSeeded ? "custom" : "seed",
  );
  const selectValue = mode === "custom" ? CUSTOM : value;

  return (
    <div className="wp-cat-field">
      <select
        id={id}
        aria-label="Category"
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === CUSTOM) {
            setMode("custom");
            onChange("");
            return;
          }
          setMode("seed");
          onChange(v);
        }}
      >
        <option value="">No category</option>
        {WEAK_POINT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {mode === "custom" && (
        <input
          aria-label="Custom category"
          placeholder="Custom category"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function Row({
  item,
  onUpdate,
  onDelete,
}: {
  item: WeakPoint;
  onUpdate: FocusListActions["onUpdate"];
  onDelete: FocusListActions["onDelete"];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [cat, setCat] = useState(item.category ?? "");

  const commit = async () => {
    const text = draft.trim();
    if (!text) {
      setDraft(item.text);
      setEditing(false);
      return;
    }
    await onUpdate(item.id, { text, category: cat.trim() || null });
    setEditing(false);
  };

  return (
    <li className={"wp-row" + (item.completed ? " is-done" : "") + (item.starred ? " is-starred" : "")}>
      <button
        type="button"
        className={"wp-check" + (item.completed ? " is-on" : "")}
        aria-label={item.completed ? "Mark not done" : "Mark done"}
        title={item.completed ? "Mark not done" : "Mark done"}
        aria-pressed={item.completed}
        onClick={() => onUpdate(item.id, { completed: !item.completed })}
      >
        {item.completed ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.2l2.4 2.4L9.8 3.5" />
          </svg>
        ) : null}
      </button>
      <button
        type="button"
        className={"wp-star" + (item.starred ? " is-on" : "")}
        aria-label={item.starred ? "Unstar" : "Star — focus while shadowing"}
        aria-pressed={item.starred}
        title="Star to show on the player"
        onClick={() => onUpdate(item.id, { starred: !item.starred })}
      >
        <StarGlyph filled={item.starred} />
      </button>
      <div className="wp-body">
        {editing ? (
          <div className="wp-edit">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void commit();
                } else if (e.key === "Escape") {
                  setDraft(item.text);
                  setCat(item.category ?? "");
                  setEditing(false);
                }
              }}
              maxLength={240}
              autoFocus
            />
            <CategoryField value={cat} onChange={setCat} />
            <div className="wp-edit-actions">
              <button type="button" className="btn" onClick={() => void commit()}>
                Save
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setDraft(item.text);
                  setCat(item.category ?? "");
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="wp-text"
            onClick={() => setEditing(true)}
          >
            <span className="wp-label">{item.text}</span>
            {item.category ? <span className="wp-tag">{item.category}</span> : null}
          </button>
        )}
      </div>
      <button
        type="button"
        className="wp-del"
        aria-label="Delete"
        onClick={() => onDelete(item.id)}
      >
        ×
      </button>
    </li>
  );
}

export function StarGlyph({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M8 2.2l1.7 3.5 3.8.6-2.7 2.7.6 3.8L8 11.2l-3.4 1.6.6-3.8-2.7-2.7 3.8-.6L8 2.2z" />
    </svg>
  );
}

export default function FocusList({
  items,
  compact,
  starOnAdd,
  emptyLabel,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    await onAdd({
      text: trimmed,
      category: category.trim() || null,
      starred: starOnAdd,
    });
    setText("");
    setSaving(false);
  };

  const groups = compact ? [{ category: null as string | null, items }] : groupWeakPoints(items);

  return (
    <div className={"wp-list" + (compact ? " is-compact" : "")}>
      <form className="wp-add" onSubmit={(e) => void submit(e)}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={compact ? "Add a focus note…" : "Add a weak point…"}
          maxLength={240}
          aria-label="New weak point"
        />
        {!compact && <CategoryField value={category} onChange={setCategory} />}
        <button type="submit" className="btn primary" disabled={!text.trim() || saving}>
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="wp-empty">{emptyLabel ?? "Nothing here yet."}</p>
      ) : (
        groups.map((group) => (
          <section key={group.category ?? "none"} className="wp-group">
            {!compact && (
              <h2 className="wp-group-title">{group.category ?? "Uncategorized"}</h2>
            )}
            <ul>
              {group.items.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
