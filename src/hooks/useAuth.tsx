import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { clearLocalCache, hydrateFromCloud } from "@/lib/interview/store";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  syncing: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  syncing: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let hydratedFor: string | null = null;

    const apply = (next: Session | null) => {
      setSession(next);
      setLoading(false);
      if (next?.user && hydratedFor !== next.user.id) {
        hydratedFor = next.user.id;
        setSyncing(true);
        hydrateFromCloud(next.user.id)
          .catch((err) => console.error("Falha ao carregar seus dados", err))
          .finally(() => setSyncing(false));
      }
      if (!next) {
        if (hydratedFor) clearLocalCache();
        hydratedFor = null;
      }
    };

    const { data } = supabase.auth.onAuthStateChange((_event, next) => apply(next));
    supabase.auth.getSession().then(({ data: d }) => apply(d.session));

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user: session?.user ?? null, session, loading, syncing }),
    [session, loading, syncing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
