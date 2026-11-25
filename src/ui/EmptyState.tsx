import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import "./EmptyState.css";

export type EmptyStateAction = {
  label: string;
  onClick: () => void;
  primary?: boolean;
};

export type EmptyStateHint = {
  label: string;
  keys: string;
};

type Props = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: EmptyStateAction[];
  hints?: EmptyStateHint[];
  children?: ReactNode;
  /** Tighter spacing for narrow sidebars and bottom panels. */
  compact?: boolean;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  hints,
  children,
  compact = false,
}: Props) {
  return (
    <div className={compact ? "empty-state empty-state--compact" : "empty-state"}>
      <div className="empty-state__icon" aria-hidden>
        <Icon size={compact ? 18 : 22} strokeWidth={1.6} />
      </div>
      <div className="empty-state__text">
        <p className="empty-state__title">{title}</p>
        {description ? <p className="empty-state__description">{description}</p> : null}
      </div>
      {actions && actions.length > 0 ? (
        <div className="empty-state__actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={
                action.primary
                  ? "empty-state__action empty-state__action--primary"
                  : "empty-state__action"
              }
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
      {hints && hints.length > 0 ? (
        <dl className="empty-state__hints">
          {hints.map((hint) => (
            <div key={hint.label} className="empty-state__hint">
              <dt>{hint.label}</dt>
              <dd>
                {hint.keys.split(" ").map((chord) => (
                  <span key={chord} className="empty-state__chord">
                    {chord.split("+").map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </div>
  );
}
