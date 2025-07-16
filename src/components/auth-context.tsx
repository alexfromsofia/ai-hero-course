"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSession } from "next-auth/react";

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  userName: string;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  const value: AuthContextType = {
    isAuthenticated: !!session?.user,
    user: session?.user ?? null,
    userName: session?.user?.name ?? "Guest",
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
