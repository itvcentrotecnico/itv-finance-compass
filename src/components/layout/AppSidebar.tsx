import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { MODULE_GROUPS } from "@/lib/modules";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
            iTV
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold text-sidebar-accent-foreground">ITV Financeiro</p>
              <p className="text-[11px] text-sidebar-foreground/60">Centro Técnico · Manaus</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {MODULE_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/45">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.modules.map((m) => {
                  const href = m.slug ? `/${m.slug}` : "/";
                  const active = path === href;
                  return (
                    <SidebarMenuButton
                      key={m.key}
                      asChild
                      isActive={active}
                      tooltip={m.title}
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[inset_2px_0_0_var(--color-sidebar-primary)]"
                    >
                      {m.slug ? (
                        <Link to="/$modulo" params={{ modulo: m.slug }}>
                          <m.icon className={active ? "text-sidebar-primary" : ""} />
                          <span>{m.title}</span>
                        </Link>
                      ) : (
                        <Link to="/">
                          <m.icon className={active ? "text-sidebar-primary" : ""} />
                          <span>{m.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <p className="px-2 py-1 text-[11px] text-sidebar-foreground/50">Fundação · Etapa 01</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

// Re-export to keep SidebarMenuItem tree-shaken usage consistent
export { SidebarMenuItem };
