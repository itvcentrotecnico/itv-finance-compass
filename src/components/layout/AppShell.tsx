import type { ReactNode } from "react";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "./AppSidebar";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { signOutClean } from "@/lib/auth/session";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, queryClient } = useRouteContext({ from: "/_authenticated" });
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOutClean(queryClient);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="h-5 w-px bg-border" />
            <p className="hidden text-sm text-muted-foreground sm:block">ITV Centro Técnico</p>
            <div className="ml-auto flex min-w-0 items-center gap-3">
              <div className="hidden min-w-0 text-right leading-tight md:block">
                <p className="truncate text-sm font-medium">{user.email}</p>
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3 text-brand" /> {role ? ROLE_LABELS[role] : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="size-4" /> Sair
              </Button>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
