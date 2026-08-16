import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
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
import { useWorkspaceCenterId } from "@/hooks/useCenterScope";
import { centerQuery } from "@/lib/api";

/** Platform level: the super admin manages the system center-first. */
const PLATFORM_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Centers", url: "/centers", icon: ShieldCheck },
  { title: "Search", url: "/search", icon: Search },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

/** Center workspace: every entry is scoped to the center in the URL. */
const CENTER_ITEMS = [
  { title: "Dashboard", url: "/centers/$centerId", icon: LayoutDashboard },
  { title: "Students", url: "/centers/$centerId/students", icon: Users },
  { title: "Teachers", url: "/centers/$centerId/teachers", icon: GraduationCap },
  { title: "Subjects & Classes", url: "/centers/$centerId/subjects", icon: BookOpen },
  { title: "Progress & Attendance", url: "/centers/$centerId/progress", icon: LineChart },
  { title: "Reports", url: "/centers/$centerId/reports", icon: FileBarChart },
  { title: "Search", url: "/centers/$centerId/search", icon: Search },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isSuperAdmin, centerId: myCenterId } = useAuth();
  const workspaceCenterId = useWorkspaceCenterId();
  const pathname = useRouterState({ select: (router) => router.location.pathname });

  // Center admins always live inside their own workspace.
  const activeCenterId = workspaceCenterId ?? (isSuperAdmin ? null : myCenterId);
  const center = useQuery(centerQuery(activeCenterId));

  const isActive = (url: string) => {
    const resolved = activeCenterId ? url.replace("$centerId", activeCenterId) : url;
    return pathname === resolved || pathname.startsWith(`${resolved}/`);
  };

  const items = activeCenterId ? CENTER_ITEMS : PLATFORM_ITEMS;

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
              <p className="truncate text-xs text-sidebar-foreground/60">
                {activeCenterId ? (center.data?.name ?? "Center workspace") : "Platform administration"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{activeCenterId ? "Center workspace" : "Platform"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link
                      to={item.url}
                      params={(activeCenterId ? { centerId: activeCenterId } : {}) as never}
                      className="flex items-center gap-2"
                    >
                      <item.icon className="size-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && activeCenterId && (
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="All centers">
                    <Link to="/centers" className="flex items-center gap-2">
                      <ArrowLeft className="size-4" />
                      {!collapsed && <span>All centers</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
