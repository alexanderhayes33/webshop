"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({
    user: null,
    session: null,
    loading: true,
    refreshSession: async () => {}
  });

  const refreshSession = async () => {
    const { data } = await supabase.auth.refreshSession();
    if (data?.session) {
      const session = data.session;
      setState((prev) => ({
        ...prev,
        user: session.user,
        session: session
      }));
    }
  };

  useEffect(() => {
    let ignore = false;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (ignore) return;
      setState({
        user: data.session?.user ?? null,
        session: data.session ?? null,
        loading: false,
        refreshSession
      });
    }

    init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (ignore) return;
      setState({
        user: session?.user ?? null,
        session: session ?? null,
        loading: false,
        refreshSession
      });
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}


