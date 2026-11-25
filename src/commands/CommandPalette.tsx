import { useEffect, useMemo, useRef, useState } from "react";
import { COMMANDS } from "./registry";
import { matchCommandQuery, type Command, type CommandContext } from "./types";
import "./CommandPalette.css";

type Props = {
  open: boolean;
  onClose: () => void;
  context: CommandContext;
  extraCommands?: Command[];
};

export function CommandPalette({
  open,
  onClose,
  context,
  extraCommands = [],
}: Props) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(
    () =>
      [...COMMANDS, ...extraCommands]
        .filter((cmd) => matchCommandQuery(cmd.title, query))
        .filter((cmd) => (cmd.when ? cmd.when(context) : true)),
    [query, context, extraCommands],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!open) return null;

  const runAt = (i: number) => {
    const cmd = items[i];
    if (!cmd) return;
    onClose();
    void cmd.run(context);
  };

  return (
    <div
      className="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
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
              setIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              runAt(index);
            }
          }}
        />
        <ul className="command-palette__list" role="listbox">
          {items.length === 0 ? (
            <li className="command-palette__empty">No matching commands</li>
          ) : (
            items.map((cmd, i) => (
              <li key={cmd.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === index}
                  className={
                    i === index
                      ? "command-palette__item command-palette__item--active"
                      : "command-palette__item"
                  }
                  onMouseEnter={() => setIndex(i)}
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
