import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Center admins of a disabled center lose access; super admins are never blocked.
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      supabase.from("profiles").select("center_id, status").eq("id", data.user.id).maybeSingle(),
    ]);
    const isSuperAdmin = (roles ?? []).some((row) => row.role === "super_admin");

    if (!isSuperAdmin) {
      if (profile?.status && profile.status !== "active") {
        await supabase.auth.signOut();
        throw redirect({ to: "/auth" });
      }
      if (profile?.center_id) {
        const { data: center } = await supabase
          .from("centers")
          .select("status")
          .eq("id", profile.center_id)
          .maybeSingle();
        if (center && center.status !== "active") {
          await supabase.auth.signOut();
          throw redirect({ to: "/auth" });
        }
      }
    }

    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
