import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import api from '../api/axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register using Firebase client SDK directly, then sync with backend
  const register = async (email, password, displayName, role) => {
    // 1. Create user client-side via Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // 2. Set display name
    await updateProfile(cred.user, { displayName });

    // 3. Try to sync with backend (sets custom claims + Firestore doc)
    //    This is optional — if backend is down, user still gets created
    try {
      await api.post('/auth/register', {
        email,
        password,
        display_name: displayName,
        role,
      });
      // Force token refresh to pick up custom claims set by backend
      await cred.user.getIdToken(true);
    } catch (err) {
      console.warn('Backend sync failed (user still created in Firebase):', err.message);
      // Store role in localStorage as fallback when backend is unavailable
      localStorage.setItem('user_role', role);
    }

    return cred.user;
  };

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const logout = async () => {
    localStorage.removeItem('user_role');
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult(true);
          const claimRole = tokenResult.claims.role;
          // Use claim role if available, otherwise fall back to localStorage
          setUserRole(claimRole || localStorage.getItem('user_role') || 'TRAVELER');
        } catch {
          setUserRole(localStorage.getItem('user_role') || 'TRAVELER');
        }
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
