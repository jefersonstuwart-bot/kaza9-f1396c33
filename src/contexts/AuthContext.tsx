import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, UserRole } from '@/types/crm';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isDirector: boolean;
  isGerente: boolean;
  isCorretor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) throw roleError;

      if (profileData) {
        setProfile(profileData as Profile);
      }
      if (roleData) {
        setRole(roleData.role as UserRole);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  // Clear invalid tokens from localStorage
  const clearInvalidSession = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore signOut errors
    }
    // Clear any remaining localStorage items
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED' && !session) {
          clearInvalidSession();
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Erro de sessão:', error);
        // Check for specific refresh token errors
        if (error.message?.includes('Refresh Token') || 
            error.message?.includes('refresh_token') ||
            (error as any).code === 'refresh_token_not_found') {
          clearInvalidSession();
          return;
        }
        // Clear invalid session state
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Falha ao obter sessão:', error);
      // Clear invalid tokens on any session error
      clearInvalidSession();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { error: error as Error | null };
    }
    
    // Check if user is active
    if (data.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('ativo')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Erro ao verificar status do usuário:', profileError);
      }
      
      if (profileData && !profileData.ativo) {
        // User is inactive, sign them out
        await supabase.auth.signOut();
        return { 
          error: new Error('Sua conta foi desativada. Entre em contato com o administrador.') 
        };
      }
    }
    
    return { error: null };
  };

  const signUp = async (email: string, password: string, nome: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { nome }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  const value = {
    user,
    session,
    profile,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    isDirector: role === 'DIRETOR',
    isGerente: role === 'GERENTE',
    isCorretor: role === 'CORRETOR',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
