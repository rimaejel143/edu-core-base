import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { EmptyState, PageHeader } from "@/components/common/DataDisplay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Center } from "@/lib/types";

/** Super Admin only. Center Admins are redirected away. */
export const Route = createFileRoute("/_authenticated/centers")({
  head: () => ({
    meta: [
      { title: "Centers — Center Management System" },
      { name: "description", content: "Platform-level view of all educational centers." },
      { property: "og:title", content: "Centers — Center Management System" },
      { property: "og:description", content: "Platform-level view of all educational centers." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.rpc("is_super_admin");
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: CentersPage,
});

function CentersPage() {
  const { data } = useQuery({
    queryKey: ["centers"],
    queryFn: async (): Promise<Center[]> => {
      const { data: rows, error } = await supabase.from("centers").select("*").order("name");
      if (error) throw new Error(error.message);
      return rows ?? [];
    },
  });

  const centers = data ?? [];

  return (
    <>
      <PageHeader title="Centers" description="All educational centers on the platform." />
      {centers.length === 0 ? (
        <EmptyState title="No centers" description="Centers created on the platform appear here." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {centers.map((center) => (
            <Card key={center.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold">{center.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground">{center.code}</p>
                  </div>
                  <Badge variant={center.status === "active" ? "default" : "secondary"}>
                    {center.status}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {[center.city, center.country].filter(Boolean).join(", ") || "—"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
