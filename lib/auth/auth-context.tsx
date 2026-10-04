"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types/database";

export interface PatientRegistrationData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signUpPatient: (
    data: PatientRegistrationData
  ) => Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }>;
  signInPatient: (
    credentials: LoginCredentials
  ) => Promise<{ success: boolean; error?: string }>;
  signInDoctor: (
    credentials: LoginCredentials
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch verified profile from database
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("[MediSphere Auth] Error fetching user profile:", error.message);
        return null;
      }
      return data as Profile | null;
    } catch (err) {
      console.error("[MediSphere Auth] Exception fetching user profile:", err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!user) {
      setProfile(null);
      return null;
    }
    const prof = await fetchProfile(user.id);
    setProfile(prof);
    return prof;
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Initial session load
    const initializeAuth = async () => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.warn("[MediSphere Auth] Session load warning:", sessionError.message);
        }

        const currentUser = sessionData?.session?.user ?? null;
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            const prof = await fetchProfile(currentUser.id);
            if (mounted) setProfile(prof);
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.error("[MediSphere Auth] Initialization error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listen to Supabase Auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      if (mounted) {
        setUser(currentUser);
        if (currentUser) {
          const prof = await fetchProfile(currentUser.id);
          if (mounted) setProfile(prof);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Register patient (Strictly role = 'patient')
  const signUpPatient = useCallback(
    async (
      data: PatientRegistrationData
    ): Promise<{ success: boolean; requiresEmailConfirmation?: boolean; error?: string }> => {
      try {
        setLoading(true);

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              phone: data.phone,
              location: data.location,
              role: "patient",
            },
          },
        });

        if (authError) {
          return { success: false, error: authError.message };
        }

        const createdUser = authData?.user;
        if (!createdUser) {
          return {
            success: false,
            error: "Failed to create user account. Please try again.",
          };
        }

        // Upsert profile record explicitly to guarantee immediate record creation
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: createdUser.id,
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,
          location: data.location,
          role: "patient", // Enforce patient role on server/DB
        });

        if (profileError) {
          console.warn("[MediSphere Auth] Profile record notice:", profileError.message);
        }

        // If email confirmation is required, session might be null
        const requiresEmailConfirmation = !authData.session;

        return {
          success: true,
          requiresEmailConfirmation,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unexpected registration error.";
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Sign in patient
  const signInPatient = useCallback(
    async (
      credentials: LoginCredentials
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setLoading(true);

        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

        if (authError) {
          return { success: false, error: authError.message };
        }

        const loggedUser = authData?.user;
        if (!loggedUser) {
          return { success: false, error: "Authentication failed. No user session returned." };
        }

        // Fetch & verify profile role from DB
        const userProfile = await fetchProfile(loggedUser.id);

        if (!userProfile) {
          // Fallback check: If profile was not auto-created, create it as patient
          const fallbackProfile: Profile = {
            id: loggedUser.id,
            full_name: (loggedUser.user_metadata?.full_name as string) || "",
            email: loggedUser.email || "",
            phone: (loggedUser.user_metadata?.phone as string) || null,
            location: (loggedUser.user_metadata?.location as string) || null,
            role: "patient",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await supabase.from("profiles").upsert(fallbackProfile);
          setUser(loggedUser);
          setProfile(fallbackProfile);
          return { success: true };
        }

        // Check if a doctor is attempting to log in via patient portal
        if (userProfile.role === "doctor") {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          return {
            success: false,
            error:
              "This account is registered as a Doctor. Please log in via the Doctor Portal.",
          };
        }

        setUser(loggedUser);
        setProfile(userProfile);
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unexpected sign-in error.";
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchProfile]
  );

  // Sign in doctor (Strictly verifies role = 'doctor')
  const signInDoctor = useCallback(
    async (
      credentials: LoginCredentials
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setLoading(true);

        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

        if (authError) {
          return { success: false, error: authError.message };
        }

        const loggedUser = authData?.user;
        if (!loggedUser) {
          return { success: false, error: "Authentication failed. No user session returned." };
        }

        // Strictly verify doctor role in the database profiles table
        const userProfile = await fetchProfile(loggedUser.id);

        if (!userProfile || userProfile.role !== "doctor") {
          // Immediately revoke session for unauthorized role
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          return {
            success: false,
            error:
              "Access Denied: This account does not have Doctor privileges. Only registered healthcare providers can access the Doctor Portal.",
          };
        }

        setUser(loggedUser);
        setProfile(userProfile);
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unexpected doctor sign-in error.";
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchProfile]
  );

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error("[MediSphere Auth] Sign out error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      role: profile?.role ?? null,
      loading,
      signUpPatient,
      signInPatient,
      signInDoctor,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, signUpPatient, signInPatient, signInDoctor, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
