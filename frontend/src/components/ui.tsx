import { ReactNode } from "react";

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-md shadow-card">
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white border border-line rounded-md shadow-card p-5">
      <p className="text-xs uppercase tracking-wide text-ink-400">{label}</p>
      <p className="text-3xl font-serif font-semibold text-ink mt-2">{value}</p>
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base = "px-4 py-2 text-sm rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-ink text-white hover:bg-ink-600",
    secondary: "bg-white border border-line text-ink hover:border-ink-200",
    danger: "bg-white border border-line text-red-600 hover:border-red-300 hover:bg-red-50",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm border border-line rounded-md focus:border-gold focus:ring-1 focus:ring-gold outline-none ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 text-sm border border-line rounded-md focus:border-gold focus:ring-1 focus:ring-gold outline-none bg-white ${props.className ?? ""}`}
    >
      {props.children}
    </select>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-line rounded-md">
      <p className="text-ink font-medium">{title}</p>
      <p className="text-ink-400 text-sm mt-1">{description}</p>
    </div>
  );
}
