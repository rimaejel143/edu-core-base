import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole, Profile } from "@/lib/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  centerId: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isCenterAdmin: boolean;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Audit trail entry for authentication events (login, logout, password reset). */
async function logAuthEvent(action: string, description: string) {
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser) return;
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("center_id, full_name")
    .eq("id", authUser.id)
    .maybeSingle();
  if (!profileRow?.center_id) return;
  await supabase.from("activity_log").insert({
    center_id: profileRow.center_id,
    actor_id: authUser.id,
    actor_name: profileRow.full_name || authUser.email || null,
    action,
    entity_type: "Authentication",
    entity_id: null,
    description,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAccount = useCallback(async (userId: string) => {
    const [profileResult, rolesResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    setProfile((profileResult.data as Profile | null) ?? null);
    setRoles(((rolesResult.data ?? []) as { role: AppRole }[]).map((row) => row.role));
  }, []);

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        // Avoid deadlocks: defer Supabase calls out of the callback.
        setTimeout(() => {
          void loadAccount(nextSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadAccount(data.session.user.id);
      }
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadAccount]);

  const value = useMemo<AuthContextValue>(() => {
    const hasRole = (role: AppRole) => roles.includes(role);

    return {
      session,
      user: session?.user ?? null,
      profile,
      roles,
      centerId: profile?.center_id ?? null,
      isLoading,
      isSuperAdmin: hasRole("super_admin"),
      isCenterAdmin: hasRole("center_admin"),
      hasRole,
      refreshProfile: async () => {
        if (session?.user) await loadAccount(session.user.id);
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) void logAuthEvent("login", `${email} signed in`);
        return { error: error?.message ?? null };
      },
      signUp: async (email, password, fullName) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        return { error: error?.message ?? null };
      },
      requestPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (!error) void logAuthEvent("password_reset", `Password reset requested for ${email}`);
        return { error: error?.message ?? null };
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await logAuthEvent("logout", `${session?.user?.email ?? "A user"} signed out`);
        await supabase.auth.signOut();
      },
    };
  }, [session, profile, roles, isLoading, loadAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
