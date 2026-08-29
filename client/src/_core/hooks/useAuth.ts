import { startLogin } from "@/const";
import { destinationForRole } from "@/lib/authRouting";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };
export type CampuswearSessionUser = { id: string | number; openId: string; name: string | null; email: string | null; role: string };

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  const legacyMe = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false, enabled: !isSupabaseConfigured });
  const legacyLogout = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.setData(undefined, null) });
  const [supabaseUser, setSupabaseUser] = useState<CampuswearSessionUser | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(isSupabaseConfigured);
  const [supabaseError, setSupabaseError] = useState<Error | null>(null);

  const loadSupabaseUser = useCallback(async () => {
    if (!supabase) return;
    setSupabaseLoading(true);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) { setSupabaseError(error); setSupabaseUser(null); setSupabaseLoading(false); return; }
    if (!user) { setSupabaseUser(null); setSupabaseLoading(false); return; }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role, full_name").eq("user_id", user.id).maybeSingle();
    if (profileError && !profileError.message.toLowerCase().includes("relation")) setSupabaseError(profileError);
    setSupabaseUser({ id: user.id, openId: user.id, name: profile?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null, email: user.email ?? null, role: profile?.role ?? "pending_assignment" });
    setSupabaseLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void loadSupabaseUser();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => { void loadSupabaseUser(); });
    return () => subscription.subscription.unsubscribe();
  }, [loadSupabaseUser]);

  const logout = useCallback(async () => {
    if (supabase) { const { error } = await supabase.auth.signOut(); if (error) throw error; setSupabaseUser(null); return; }
    try { await legacyLogout.mutateAsync(); } catch (error: unknown) { if (!(error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED")) throw error; } finally { try { sessionStorage.removeItem("manus-cookie"); } catch {} utils.auth.me.setData(undefined, null); await utils.auth.me.invalidate(); }
  }, [legacyLogout, utils]);

  const state = useMemo(() => {
    const user = isSupabaseConfigured ? supabaseUser : (legacyMe.data ?? null);
    return { user, loading: isSupabaseConfigured ? supabaseLoading : (legacyMe.isLoading || legacyLogout.isPending), error: isSupabaseConfigured ? supabaseError : (legacyMe.error ?? legacyLogout.error ?? null), isAuthenticated: Boolean(user) };
  }, [legacyLogout.error, legacyLogout.isPending, legacyMe.data, legacyMe.error, legacyMe.isLoading, supabaseError, supabaseLoading, supabaseUser]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || state.loading || state.user || typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;
    if (redirectPath) window.location.assign(redirectPath);
    else if (isSupabaseConfigured) window.location.assign(`/auth?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
    else startLogin();
  }, [redirectOnUnauthenticated, redirectPath, state.loading, state.user]);

  return { ...state, refresh: isSupabaseConfigured ? loadSupabaseUser : () => legacyMe.refetch(), logout };
}
