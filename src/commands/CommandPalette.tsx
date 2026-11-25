import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { COMMANDS } from "./registry";
import { rememberCommandId, readRecentCommandIds } from "./recentCommands";
import { matchCommandQuery, type Command, type CommandContext } from "./types";
import { EmptyState } from "../ui/EmptyState";
import "./CommandPalette.css";

type Props = {
  open: boolean;
  onClose: () => void;
  context: CommandContext;
  extraCommands?: Command[];
  seed?: string;
};

function Keybinding({ value }: { value: string }) {
  return (
    <span className="command-palette__keys">
      {value.split(" ").map((chord, ci) => (
        <span key={`${chord}:${ci}`} className="command-palette__chord">
          {chord.split("+").map((key, ki) => (
            <kbd key={`${key}:${ki}`}>{key}</kbd>
          ))}
        </span>
      ))}
    </span>
  );
}

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

  const { items, recentCount } = useMemo(() => {
    const all = [...COMMANDS, ...extraCommands].filter((cmd) =>
      cmd.when ? cmd.when(context) : true,
    );
    const matched = all.filter((cmd) => matchCommandQuery(cmd.title, query));
    if (query.trim()) return { items: matched, recentCount: 0 };

    const byId = new Map(all.map((cmd) => [cmd.id, cmd]));
    const recent: Command[] = [];
    for (const id of recentIds) {
      const cmd = byId.get(id);
      if (cmd) recent.push(cmd);
    }
    const recentSet = new Set(recent.map((cmd) => cmd.id));
    const rest = matched.filter((cmd) => !recentSet.has(cmd.id));
    return { items: [...recent, ...rest], recentCount: recent.length };
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
    const activeItem = listRef.current.querySelector<HTMLElement>(`[data-index="${index}"]`);
    activeItem?.scrollIntoView({ block: "nearest" });
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

  const sectionLabel = (i: number): string | null => {
    if (recentCount === 0) return null;
    if (i === 0) return "Recently used";
    if (i === recentCount) return "All commands";
    return null;
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
      <div className="command-palette__panel">
        <div className="command-palette__search">
          <Search size={15} strokeWidth={1.75} className="command-palette__search-icon" aria-hidden />
          <input
            ref={inputRef}
            className="command-palette__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            aria-label="Filter commands"
            spellCheck={false}
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
        </div>
        {items.length === 0 ? (
          <div className="command-palette__empty">
            <EmptyState
              compact
              icon={SearchX}
              title="No matching commands"
              description="Try a shorter or different search."
            />
          </div>
        ) : (
          <ul ref={listRef} className="command-palette__list" role="listbox">
            {items.map((cmd, i) => {
              const label = sectionLabel(i);
              return (
                <li key={`${cmd.id}:${i}`}>
                  {label ? (
                    <div className="command-palette__section" role="presentation">
                      {label}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    data-index={i}
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
                        <span className="command-palette__category">{cmd.category}</span>
                      ) : null}
                      <span className="command-palette__name">{cmd.title}</span>
                    </span>
                    {cmd.keybinding ? <Keybinding value={cmd.keybinding} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="command-palette__footer" aria-hidden>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> run
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
