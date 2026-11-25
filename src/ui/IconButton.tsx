import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./IconButton.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  label: string;
  active?: boolean;
  size?: number;
  children?: ReactNode;
};

export function IconButton({
  icon: Icon,
  label,
  active = false,
  size = 15,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={`icon-btn${active ? " icon-btn--active" : ""} ${className}`.trim()}
      title={label}
      aria-label={label}
      {...rest}
    >
      {Icon ? <Icon size={size} strokeWidth={1.75} aria-hidden /> : null}
      {children}
    </button>
  );
}
