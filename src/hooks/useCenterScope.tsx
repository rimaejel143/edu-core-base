import { useParams } from "@tanstack/react-router";

import { useAuth } from "@/hooks/useAuth";

/**
 * The center currently being managed.
 *
 * - Inside a center workspace (`/centers/$centerId/...`) it is that center.
 * - Elsewhere it falls back to the signed-in user's own center.
 * - Super admins outside a workspace get `null`, meaning platform-wide.
 */
export function useScopeId(): string | null {
  const params = useParams({ strict: false }) as { centerId?: string };
  const { profile, isSuperAdmin } = useAuth();
  if (params.centerId) return params.centerId;
  if (isSuperAdmin) return null;
  return profile?.center_id ?? null;
}

/** The center id of the workspace being viewed, if any. */
export function useWorkspaceCenterId(): string | null {
  const params = useParams({ strict: false }) as { centerId?: string };
  return params.centerId ?? null;
}
