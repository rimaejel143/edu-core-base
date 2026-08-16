import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { centerQuery } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/centers/$centerId")({
  beforeLoad: async ({ params }) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw redirect({ to: "/auth" });

    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
      supabase.from("profiles").select("center_id").eq("id", auth.user.id).maybeSingle(),
    ]);
    const isSuperAdmin = (roles ?? []).some((row) => row.role === "super_admin");

    // Center admins may only ever enter their own center workspace.
    if (!isSuperAdmin && profile?.center_id !== params.centerId) {
      throw redirect({ to: "/dashboard" });
    }
    return { workspaceCenterId: params.centerId };
  },
  component: CenterWorkspaceLayout,
});

function CenterWorkspaceLayout() {
  const { centerId } = Route.useParams();
  const center = useQuery(centerQuery(centerId));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <Building2 className="size-4 text-primary" />
        <span className="text-sm font-medium">
          {center.data?.name ?? "Center workspace"}
        </span>
        {center.data?.code && (
          <span className="font-mono text-xs text-muted-foreground">{center.data.code}</span>
        )}
        {center.data?.status && (
          <Badge variant={center.data.status === "active" ? "secondary" : "outline"}>
            {center.data.status}
          </Badge>
        )}
        <span className="ml-auto text-xs text-muted-foreground">Center workspace</span>
      </div>
      <Outlet />
    </>
  );
}
