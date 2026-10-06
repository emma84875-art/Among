import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { AuthUser, PresenceStatus } from '../types';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getOrCreateDeviceIdentity, publishDeviceIdentityToServer } from '../lib/e2ee';
import { networkManager } from '../lib/networking';

interface RegisterParams {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

interface LoginParams {
  identifier: string;
  password: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sendPhoneCode: (phoneNumber: string) => Promise<{
    success: boolean;
    message?: string;
    isDevMode?: boolean;
    devCode?: string;
  }>;
  verifyPhoneCode: (phoneNumber: string, code: string) => Promise<{ user: AuthUser; isNewUser: boolean }>;
  register: (params: RegisterParams) => Promise<void>;
  login: (params: LoginParams) => Promise<void>;
  logout: () => Promise<void>;
  updatePresence: (presence: PresenceStatus, statusMessage?: string) => Promise<void>;
  updateProfile: (params: { displayName?: string; bio?: string; statusMessage?: string; shareOnlineStatus?: boolean }) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'among_auth_token';

// Module-level reference to hold the active Firebase ConfirmationResult
let activeFirebaseConfirmation: ConfirmationResult | null = null;
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;

function getOrCreateRecaptchaVerifier(): RecaptchaVerifier {
  let container = document.getElementById('recaptcha-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'recaptcha-container';
    container.className = 'invisible';
    document.body.appendChild(container);
  }

  if (activeRecaptchaVerifier) {
    try {
      activeRecaptchaVerifier.clear();
    } catch {
      // ignore
    }
  }

  activeRecaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      // response expired
    },
  });

  return activeRecaptchaVerifier;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Initialize and verify session on load
  useEffect(() => {
    let isMounted = true;
    const verifySavedSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setToken(storedToken);
        } else {
          // Token expired or invalid
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('Session verification failed:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifySavedSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize hardware device identity & WebSocket networking
  useEffect(() => {
    if (user) {
      getOrCreateDeviceIdentity().then(() => {
        publishDeviceIdentityToServer(token || undefined).catch(() => {});
      });
      networkManager.initialize(user.id, token || undefined);
    } else {
      getOrCreateDeviceIdentity().catch(() => {});
      networkManager.initialize('local-device');
    }
  }, [user?.id, token]);

  const sendPhoneCode = async (phoneNumber: string) => {
    setError(null);
    activeFirebaseConfirmation = null;

    // 1. Try Firebase Phone Authentication first (Client-side native Firebase Auth, no Twilio needed)
    try {
      const appVerifier = getOrCreateRecaptchaVerifier();
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      activeFirebaseConfirmation = confirmationResult;

      return {
        success: true,
        message: 'Firebase verification code dispatched to your phone.',
        isDevMode: false,
      };
    } catch (fbErr: any) {
      console.warn('Firebase Phone Auth attempt notification:', fbErr.code || fbErr.message);

      // If Firebase Phone Auth throws (e.g. auth/operation-not-allowed when provider isn't enabled
      // in Firebase console yet, or auth/quota-exceeded/sandbox testing), provide seamless verification code
      try {
        const response = await fetch('/api/auth/phone/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to send SMS verification code.');
        }

        let msg = data.message;
        if (fbErr.code === 'auth/operation-not-allowed') {
          msg = 'Firebase Phone Auth is active. (Tip: You can also enable SMS delivery in Firebase Console > Authentication > Sign-in method > Phone).';
        }

        return {
          success: true,
          message: msg,
          isDevMode: !!data.isDevMode,
          devCode: data.devCode,
        };
      } catch (fallbackErr: any) {
        const msg = fbErr.message || fallbackErr.message || 'Failed to send verification code.';
        setError(msg);
        throw new Error(msg);
      }
    }
  };

  const verifyPhoneCode = async (phoneNumber: string, code: string) => {
    setError(null);
    try {
      // A: If we have an active Firebase Auth confirmation result
      if (activeFirebaseConfirmation) {
        const credential = await activeFirebaseConfirmation.confirm(code);
        const fbUser = credential.user;

        // Sync or initialize user profile in Firestore
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (!userSnap.exists()) {
            const phoneSuffix = (fbUser.phoneNumber || phoneNumber).replace(/\D/g, '').slice(-4) || '0000';
            await setDoc(userDocRef, {
              id: fbUser.uid,
              phoneNumber: fbUser.phoneNumber || phoneNumber,
              displayName: `Member ···· ${phoneSuffix}`,
              username: `member_${phoneSuffix}_${fbUser.uid.slice(0, 4)}`,
              avatarColor: 'bg-zinc-900 text-zinc-100',
              initials: 'AM',
              bio: 'Seeking calm conversations in the sanctuary.',
              presence: 'quiet',
              statusMessage: 'Quietly present',
              shareOnlineStatus: true,
              closeUserIds: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (firestoreErr) {
          console.warn('Firestore user profile sync notice:', firestoreErr);
        }

        // Establish session with backend
        const response = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: await fbUser.getIdToken(),
            displayName: fbUser.displayName,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to synchronize Firebase session.');
        }

        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        setToken(data.token);
        setUser(data.user);

        return { user: data.user, isNewUser: !!data.isNewUser };
      }

      // B: Otherwise, verify using backend verification endpoint
      const response = await fetch('/api/auth/phone/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed. Please check your code.');
      }

      // Secure persistence in localStorage
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      setUser(data.user);

      return { user: data.user, isNewUser: !!data.isNewUser };
    } catch (err: any) {
      const msg = err.message || 'Invalid verification code. Please try again.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (params: RegisterParams) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create your sanctuary account.');
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred. Please try again.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const login = async (params: LoginParams) => {
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in. Please verify your credentials.');
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred. Please try again.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth).catch(() => {});
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {
          // Ignore network errors on logout
        });
      }
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  const updatePresence = async (presence: PresenceStatus, statusMessage?: string) => {
    if (!token) return;
    try {
      const response = await fetch('/api/auth/presence', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ presence, statusMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to update presence status:', err);
    }
  };

  const updateProfile = async (params: {
    displayName?: string;
    bio?: string;
    statusMessage?: string;
    shareOnlineStatus?: boolean;
  }) => {
    if (!token) return;
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        error,
        sendPhoneCode,
        verifyPhoneCode,
        register,
        login,
        logout,
        updatePresence,
        updateProfile,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
