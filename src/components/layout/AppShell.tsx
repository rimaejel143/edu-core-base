import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Search, User as UserIcon } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceCenterId } from "@/hooks/useCenterScope";
import { centerQuery, initials } from "@/lib/api";

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, user, isSuperAdmin, signOut } = useAuth();
  const workspaceCenterId = useWorkspaceCenterId();
  const activeCenterId = workspaceCenterId ?? (isSuperAdmin ? null : (profile?.center_id ?? null));
  const centerName = useQuery(centerQuery(activeCenterId)).data?.name ?? null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (activeCenterId) {
      void navigate({
        to: "/centers/$centerId/search",
        params: { centerId: activeCenterId },
        search: { q: term.trim() },
      });
      return;
    }
    void navigate({ to: "/search", search: { q: term.trim() } });
  }

  const displayName = profile?.full_name?.trim() || user?.email || "Account";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/80 px-3 backdrop-blur sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger />
              <span className="truncate text-sm font-medium text-muted-foreground">
                {centerName ?? (isSuperAdmin ? "Platform administration" : "No center assigned")}
              </span>
            </div>

            <form onSubmit={handleSearch} className="relative mx-2 hidden max-w-sm flex-1 md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={
                  isSuperAdmin
                    ? activeCenterId
                      ? "Search this center…"
                      : "Search centers…"
                    : "Search students, teachers, classes…"
                }
                className="h-9 pl-9"
                aria-label="Global search"
              />
            </form>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {isSuperAdmin ? "Super Admin" : "Center Admin"}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {initials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void navigate({ to: "/settings" })}>
                    <UserIcon className="size-4" />
                    Account settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void handleSignOut()}>
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 px-3 py-5 sm:px-6 sm:py-7">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
