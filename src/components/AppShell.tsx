"use client";

import { usePathname } from "next/navigation";

export function AppShell({ children, header }: { children: React.ReactNode; header: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
    </>
  );
}
