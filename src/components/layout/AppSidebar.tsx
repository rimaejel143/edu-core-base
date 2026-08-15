import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  Search,
  Settings,
  ShieldCheck,
  Users,
  FileBarChart,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Search", url: "/search", icon: Search },
  { title: "Students", url: "/students", icon: Users },
  { title: "Teachers", url: "/teachers", icon: GraduationCap },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
  { title: "Progress", url: "/progress", icon: LineChart },
  { title: "Reports", url: "/reports", icon: FileBarChart },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

const SUPER_ADMIN_ITEMS = [{ title: "Centers", url: "/centers", icon: ShieldCheck }] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isSuperAdmin } = useAuth();
  const pathname = useRouterState({ select: (router) => router.location.pathname });

  const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
            CM
          </span>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold text-sidebar-foreground">
                Center Manager
              </p>
              <p className="text-xs text-sidebar-foreground/60">Administration</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SUPER_ADMIN_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="size-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
