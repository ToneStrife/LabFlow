"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Profile } from "@/hooks/use-profiles"; // Assuming Profile interface exists

interface SessionContextType {
  session: { user: { id: string; email: string } } | null;
  profile: Profile | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<{ user: { id: string; email: string } } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Simulate a logged-in user and profile
  useEffect(() => {
    const mockUser = { id: "mock-user-id-123", email: "user@example.com" };
    const mockProfile: Profile = {
      id: "mock-user-id-123",
      first_name: "Mock",
      last_name: "User",
      avatar_url: null,
      updated_at: new Date().toISOString(),
      role: "Requester",
    };

    setSession({ user: mockUser });
    setProfile(mockProfile);
    setLoading(false);
  }, []);

  const login = () => {
    // In a real app, this would handle actual login logic
    const mockUser = { id: "mock-user-id-123", email: "user@example.com" };
    const mockProfile: Profile = {
      id: "mock-user-id-123",
      first_name: "Mock",
      last_name: "User",
      avatar_url: null,
      updated_at: new Date().toISOString(),
      role: "Requester",
    };
    setSession({ user: mockUser });
    setProfile(mockProfile);
    queryClient.invalidateQueries();
  };

  const logout = () => {
    // In a real app, this would handle actual logout logic
    setSession(null);
    setProfile(null);
    queryClient.invalidateQueries();
  };

  return (
    <SessionContext.Provider value={{ session, profile, loading, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionContextProvider");
  }
  return context;
};