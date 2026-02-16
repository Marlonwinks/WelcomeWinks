import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { authService } from '../services/auth.service';
import { AppUser, CookieAccount, UserProfile, AuthState } from '../types/firebase';

interface AuthContextType extends AuthState {
  // Full account methods
  signUp: (registrationData: any) => Promise<AppUser>;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Cookie account methods
  createCookieAccount: (ipAddress?: string) => Promise<CookieAccount>;
  getCookieAccount: (cookieId: string) => Promise<CookieAccount | null>;
  updateCookieActivity: (cookieId: string) => Promise<void>;
  
  // Account management
  migrateCookieToFullAccount: (cookieId: string, firebaseUser: FirebaseUser) => Promise<void>;
  getCurrentAccount: () => { type: 'full' | 'cookie' | 'none'; data: AppUser | CookieAccount | null };
  
  // Profile management
  getUserProfile: (userId: string) => Promise<UserProfile | null>;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userProfile: null,
    cookieAccount: null,
    loading: true,
    error: null
  });

  // Initialize authentication state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));

        if (firebaseUser) {
          // User is signed in with full account
          const userProfile = await authService.getUserProfile(firebaseUser.uid);
          setAuthState({
            user: firebaseUser,
            userProfile,
            cookieAccount: null,
            loading: false,
            error: null
          });
        } else {
          // No full account, check for cookie account
          const cookieAccountService = (await import('../services/cookieAccount.service')).CookieAccountService.getInstance();
          const cookieId = await cookieAccountService.getCookieFromStorage();
          let cookieAccount: CookieAccount | null = null;

          if (cookieId) {
            try {
              cookieAccount = await authService.getCookieAccount(cookieId);
              if (cookieAccount) {
                // Update activity to extend expiration
                await authService.updateCookieActivity(cookieId);
              }
            } catch (error) {
              console.warn('Failed to restore cookie account:', error);
              // Clear invalid cookie from storage
              await cookieAccountService.clearCookieFromStorage();
            }
          }

          // If no cookie account exists, create one automatically
          if (!cookieAccount) {
            try {
              const ipAddressService = (await import('../services/ipAddress.service')).ipAddressService;
              const currentIP = await ipAddressService.getCurrentIPAddress();
              cookieAccount = await authService.createCookieAccount(currentIP);
            } catch (error) {
              console.warn('Failed to create cookie account:', error);
            }
          }

          setAuthState({
            user: null,
            userProfile: null,
            cookieAccount,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Auth state initialization error:', error);
        setAuthState({
          user: null,
          userProfile: null,
          cookieAccount: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error'
        });
      }
    });

    return unsubscribe;
  }, []);

  // Sign up with full account
  const signUp = async (registrationData: any): Promise<AppUser> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const appUser = await authService.signUp(registrationData);
      return appUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<AppUser> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const appUser = await authService.signIn(email, password);
      return appUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      await authService.signOut();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    try {
      await authService.resetPassword(email);
    } catch (error) {
      throw error;
    }
  };

  // Create cookie account
  const createCookieAccount = async (ipAddress?: string): Promise<CookieAccount> => {
    try {
      const cookieAccount = await authService.createCookieAccount(ipAddress);
      setAuthState(prev => ({ ...prev, cookieAccount }));
      return cookieAccount;
    } catch (error) {
      throw error;
    }
  };

  // Get cookie account
  const getCookieAccount = async (cookieId: string): Promise<CookieAccount | null> => {
    return authService.getCookieAccount(cookieId);
  };

  // Update cookie activity
  const updateCookieActivity = async (cookieId: string): Promise<void> => {
    await authService.updateCookieActivity(cookieId);
  };

  // Migrate cookie to full account
  const migrateCookieToFullAccount = async (cookieId: string, firebaseUser: FirebaseUser): Promise<void> => {
    try {
      await authService.migrateCookieToFullAccount(cookieId, firebaseUser);
      setAuthState(prev => ({ ...prev, cookieAccount: null }));
    } catch (error) {
      throw error;
    }
  };

  // Get current account info
  const getCurrentAccount = () => {
    if (authState.user) {
      return { type: 'full' as const, data: authState.user };
    }
    if (authState.cookieAccount) {
      return { type: 'cookie' as const, data: authState.cookieAccount };
    }
    return { type: 'none' as const, data: null };
  };

  // Get user profile
  const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    return authService.getUserProfile(userId);
  };

  // Update user profile
  const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
    await authService.updateUserProfile(userId, updates);
    
    // Update local state if it's the current user
    if (authState.userProfile?.userId === userId) {
      setAuthState(prev => ({
        ...prev,
        userProfile: prev.userProfile ? { ...prev.userProfile, ...updates } : null
      }));
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
    createCookieAccount,
    getCookieAccount,
    updateCookieActivity,
    migrateCookieToFullAccount,
    getCurrentAccount,
    getUserProfile,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}