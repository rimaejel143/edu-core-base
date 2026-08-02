import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Values = Record<string, unknown>;

/**
 * Small CRUD helper shared by every module page.
 * Writes go through the Supabase client, so row level security keeps
 * every operation scoped to the caller's center (super admins see all).
 */
export function useCrud(table: string, label: string) {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [pending, setPending] = useState(false);

  const log = useCallback(
    async (action: string, centerId: unknown, entityId: string | null, description: string) => {
      if (typeof centerId !== "string" || !centerId) return;
      await supabase.from("activity_log").insert({
        center_id: centerId,
        actor_id: user?.id ?? null,
        actor_name: profile?.full_name ?? null,
        action,
        entity_type: label,
        entity_id: entityId,
        description,
      });
    },
    [label, profile?.full_name, user?.id],
  );

  const run = useCallback(
    async (
      fn: () => Promise<{ data: unknown; error: { message: string } | null }>,
      success: string,
    ): Promise<boolean> => {
      setPending(true);
      const { data, error } = await fn();
      setPending(false);
      if (error) {
        toast.error(error.message);
        return false;
      }
      await queryClient.invalidateQueries();
      toast.success(success);
      return Boolean(data) || true;
    },
    [queryClient],
  );

  const create = useCallback(
    async (values: Values, description: string) => {
      setPending(true);
      const { data, error } = await supabase
        .from(table as never)
        .insert(values as never)
        .select()
        .maybeSingle();
      setPending(false);
      if (error) {
        toast.error(error.message);
        return null;
      }
      const row = data as { id?: string } | null;
      await log("created", values["center_id"], row?.id ?? null, description);
      await queryClient.invalidateQueries();
      toast.success(`${label} created`);
      return row;
    },
    [label, log, queryClient, table],
  );

  const update = useCallback(
    async (id: string, values: Values, description: string) => {
      const ok = await run(
        async () =>
          await supabase
            .from(table as never)
            .update(values as never)
            .eq("id", id)
            .select()
            .maybeSingle(),
        `${label} updated`,
      );
      if (ok) await log("updated", values["center_id"], id, description);
      return ok;
    },
    [label, log, run, table],
  );

  const remove = useCallback(
    async (id: string, centerId: unknown, description: string) => {
      setPending(true);
      const { error } = await supabase.from(table as never).delete().eq("id", id);
      setPending(false);
      if (error) {
        toast.error(error.message);
        return false;
      }
      await log("deleted", centerId, id, description);
      await queryClient.invalidateQueries();
      toast.success(`${label} deleted`);
      return true;
    },
    [label, log, queryClient, table],
  );

  return { create, update, remove, pending };
}
