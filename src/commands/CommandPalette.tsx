import { useEffect, useMemo, useRef, useState } from "react";
import { COMMANDS } from "./registry";
import { rememberCommandId, readRecentCommandIds } from "./recentCommands";
import { matchCommandQuery, type Command, type CommandContext } from "./types";
import "./CommandPalette.css";

type Props = {
  open: boolean;
  onClose: () => void;
  context: CommandContext;
  extraCommands?: Command[];
  seed?: string;
};

export function CommandPalette({
  open,
  onClose,
  context,
  extraCommands = [],
  seed = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>(() => readRecentCommandIds());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isKeyNavRef = useRef(false);

  const items = useMemo(() => {
    const all = [...COMMANDS, ...extraCommands].filter((cmd) =>
      cmd.when ? cmd.when(context) : true,
    );
    const matched = all.filter((cmd) => matchCommandQuery(cmd.title, query));
    if (query.trim()) return matched;

    const byId = new Map(all.map((cmd) => [cmd.id, cmd]));
    const recent: Command[] = [];
    for (const id of recentIds) {
      const cmd = byId.get(id);
      if (cmd) recent.push({ ...cmd, category: cmd.category ? `Recent · ${cmd.category}` : "Recent" });
    }
    const recentSet = new Set(recent.map((cmd) => cmd.id));
    const rest = matched.filter((cmd) => !recentSet.has(cmd.id));
    return [...recent, ...rest];
  }, [query, context, extraCommands, recentIds]);

  useEffect(() => {
    if (!open) return;
    setRecentIds(readRecentCommandIds());
    setQuery(seed);
    setIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, seed]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const activeItem = listRef.current.children[index] as HTMLElement | undefined;
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [index, open]);

  if (!open) return null;

  const runAt = (i: number) => {
    const cmd = items[i];
    if (!cmd) return;
    rememberCommandId(cmd.id);
    setRecentIds(readRecentCommandIds());
    onClose();
    void cmd.run(context);
  };

  return (
    <div
      className="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseMove={() => {
        isKeyNavRef.current = false;
      }}
    >
      <button
        type="button"
        className="command-palette__backdrop"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div className="command-palette__panel island">
        <input
          ref={inputRef}
          className="command-palette__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command…"
          aria-label="Filter commands"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              isKeyNavRef.current = true;
              setIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              isKeyNavRef.current = true;
              setIndex((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              runAt(index);
            }
          }}
        />
        <ul ref={listRef} className="command-palette__list" role="listbox">
          {items.length === 0 ? (
            <li className="command-palette__empty">No matching commands</li>
          ) : (
            items.map((cmd, i) => (
              <li key={`${cmd.id}:${cmd.category ?? ""}:${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === index}
                  className={
                    i === index
                      ? "command-palette__item command-palette__item--active"
                      : "command-palette__item"
                  }
                  onMouseMove={() => {
                    if (!isKeyNavRef.current && index !== i) {
                      setIndex(i);
                    }
                  }}
                  onClick={() => runAt(i)}
                >
                  <span className="command-palette__title">
                    {cmd.category ? (
                      <span className="command-palette__category">
                        {cmd.category}:{" "}
                      </span>
                    ) : null}
                    {cmd.title}
                  </span>
                  {cmd.keybinding ? (
                    <span className="command-palette__keys">{cmd.keybinding}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
