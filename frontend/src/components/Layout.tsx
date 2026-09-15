import { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function Layout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex items-start justify-between px-10 py-8 border-b border-line bg-white">
          <div>
            <h1 className="text-2xl text-ink font-semibold">{title}</h1>
            {description && <p className="text-ink-400 text-sm mt-1 max-w-xl">{description}</p>}
          </div>
          {actions && <div className="flex gap-3">{actions}</div>}
        </header>
        <main className="flex-1 px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
