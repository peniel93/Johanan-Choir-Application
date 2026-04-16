import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUpAdmin: (email: string, password: string, fullName: string) => Promise<void>;
  setupFirstSuperAdmin: (email: string, password: string, fullName: string, ownerEmail: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout')), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const ownerEmail = process.env.EXPO_PUBLIC_OWNER_EMAIL?.trim().toLowerCase() ?? '';
  const sessionUser = session?.user ?? null;
  const isOwnerSessionUser = ownerEmail && sessionUser?.email?.trim().toLowerCase() === ownerEmail;
  const effectiveProfile: Profile | null =
    profile ??
    (isOwnerSessionUser && sessionUser
      ? {
          id: sessionUser.id,
          email: sessionUser.email ?? ownerEmail,
          full_name: (sessionUser.user_metadata?.full_name as string | undefined) ?? 'Super Admin',
          role: 'super_admin',
          permissions: ['lyrics.create', 'lyrics.update', 'lyrics.delete', 'admins.manage'],
        }
      : null);

  async function ensureProfile(user: User) {
    const fallbackName = user.email?.split('@')[0] ?? 'Admin';
    await supabase.rpc('ensure_my_profile', {
      p_full_name: (user.user_metadata?.full_name as string | undefined) ?? fallbackName,
    });
  }

  async function loadProfile(user?: User | null) {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    const fallbackOwnerProfile: Profile | null =
      ownerEmail && user.email?.trim().toLowerCase() === ownerEmail
        ? {
            id: user.id,
            email: user.email ?? ownerEmail,
            full_name: (user.user_metadata?.full_name as string | undefined) ?? 'Super Admin',
            role: 'super_admin',
            permissions: ['lyrics.create', 'lyrics.update', 'lyrics.delete', 'admins.manage'],
          }
        : null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,permissions')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      setProfile(fallbackOwnerProfile);
      return;
    }

    if (!data) {
      try {
        await ensureProfile(user);
      } catch {
        // Profile bootstrap may fail before SQL setup; keep login available.
      }

      const { data: retryData } = await supabase
        .from('profiles')
        .select('id,email,full_name,role,permissions')
        .eq('id', user.id)
        .maybeSingle();

      if (!retryData && ownerEmail && user.email?.trim().toLowerCase() === ownerEmail) {
        try {
          await supabase.rpc('bootstrap_super_admin', {
            p_owner_email: ownerEmail,
            p_full_name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Owner',
          });
        } catch {
          // If bootstrap fails, keep fallback state and let UI show retry actions.
        }

        const { data: ownerRetry } = await supabase
          .from('profiles')
          .select('id,email,full_name,role,permissions')
          .eq('id', user.id)
          .maybeSingle();

        setProfile((ownerRetry as Profile | null) ?? fallbackOwnerProfile);
        return;
      }

      setProfile((retryData as Profile | null) ?? fallbackOwnerProfile);
      return;
    }

    setProfile((data as Profile | null) ?? null);
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), 10000);
        if (!mounted) {
          return;
        }

        setSession(data.session);
        await withTimeout(loadProfile(data.session?.user), 10000);
      } catch {
        if (mounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, current) => {
      setLoading(true);
      setSession(current);

      try {
        await withTimeout(loadProfile(current?.user), 10000);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  }

  async function signUpAdmin(email: string, password: string, fullName: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.session?.user) {
      await ensureProfile(data.session.user);
      await loadProfile(data.session.user);
    }
  }

  async function setupFirstSuperAdmin(email: string, password: string, fullName: string, ownerEmail: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOwner = ownerEmail.trim().toLowerCase();

    if (normalizedEmail !== normalizedOwner) {
      throw new Error('Owner email mismatch');
    }

    let login = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (login.error) {
      const signUpResult = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (
        signUpResult.error &&
        !/already registered|already been registered|user already exists/i.test(signUpResult.error.message)
      ) {
        throw signUpResult.error;
      }

      login = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    }

    if (login.error) {
      if (/email.*confirm|confirm.*email|not confirmed/i.test(login.error.message)) {
        throw new Error('መግባት አልተቻለም። Email ማረጋገጥ ያስፈልጋል። በSupabase Authentication ውስጥ Confirm Email ያጥፉ ወይም ኢሜይሉን ያረጋግጡ።');
      }

      throw login.error;
    }

    if (!login.data.session) {
      throw new Error('መግባት አልተቻለም። እባክዎ የኢሜይል ማረጋገጫ ቅንብርን ያረጋግጡ።');
    }

    await ensureProfile(login.data.user);

    const { error } = await supabase.rpc('bootstrap_super_admin', {
      p_owner_email: normalizedOwner,
      p_full_name: fullName,
    });

    if (error) {
      throw error;
    }

    await loadProfile(login.data.user);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    await loadProfile(session?.user);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: effectiveProfile,
      loading,
      signIn,
      signUpAdmin,
      setupFirstSuperAdmin,
      signOut,
      refreshProfile,
      hasPermission: (permission: string) => {
        if (!effectiveProfile) {
          return false;
        }

        if (effectiveProfile.role === 'super_admin') {
          return true;
        }

        return effectiveProfile.permissions.includes(permission);
      },
    }),
    [effectiveProfile, loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
