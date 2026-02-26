import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

import api from '../api/axios';
import { auth } from '../lib/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [businessType, setBusinessType] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyProfile = useCallback((profile) => {
    setUserProfile(profile || null);
    setBusinessType(profile?.business_profile?.business_type || null);
    if (profile?.role) {
      setUserRole(profile.role);
      localStorage.setItem('user_role', profile.role);
    }
  }, []);

  const refreshUserProfile = useCallback(async (user = null) => {
    const targetUser = user || auth.currentUser;
    if (!targetUser) return null;

    try {
      const token = await targetUser.getIdToken();
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = res?.data?.data || null;
      applyProfile(profile);
      return profile;
    } catch {
      setUserProfile(null);
      setBusinessType(null);
      return null;
    }
  }, [applyProfile]);

  // Register using Firebase Auth first, then persist role/profile in backend.
  const register = async (email, password, displayName, role, businessProfile = null) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    localStorage.setItem('user_role', role);

    try {
      await api.post('/auth/register', {
        uid: cred.user.uid,
        email,
        password,
        display_name: displayName,
        role,
        business_profile: businessProfile,
      });

      setCurrentUser(cred.user);
      setUserRole(role);
      setBusinessType(role === 'BUSINESS' ? businessProfile?.business_type || null : null);
      await cred.user.getIdToken(true);
      await refreshUserProfile(cred.user);
      return cred.user;
    } catch (err) {
      // Keep auth + profile creation consistent by rolling back on sync failure.
      localStorage.removeItem('user_role');
      setUserRole(null);
      setUserProfile(null);
      setBusinessType(null);
      try {
        await cred.user.delete();
      } catch (cleanupErr) {
        console.warn('Failed to roll back Firebase user after register sync failure:', cleanupErr.message);
      }
      throw err;
    }
  };

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await cred.user.getIdToken(true);
    await refreshUserProfile(cred.user);
    return cred.user;
  };

  const logout = async () => {
    localStorage.removeItem('user_role');
    setUserProfile(null);
    setBusinessType(null);
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const tokenResult = await user.getIdTokenResult(true);
          const claimRole = tokenResult.claims.role;
          setUserRole(claimRole || localStorage.getItem('user_role') || 'TRAVELER');
        } catch {
          setUserRole(localStorage.getItem('user_role') || 'TRAVELER');
        }
        await refreshUserProfile(user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setUserProfile(null);
        setBusinessType(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [refreshUserProfile]);

  const value = {
    currentUser,
    userRole,
    userProfile,
    businessType,
    loading,
    login,
    register,
    logout,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
