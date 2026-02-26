import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
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

  // Register a new user and create their profile via the backend API
  const register = async (email, password, displayName, role) => {
    // 1. Create the user in Firebase Auth via our backend
    // Our backend creates the Firebase user, sets the custom claim, and creates the Firestore doc
    const response = await api.post('/auth/register', {
      email,
      password,
      display_name: displayName,
      role
    });
    
    // 2. Sign them in on the client
    await signInWithEmailAndPassword(auth, email, password);
    
    return response.data;
  };

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Force token refresh to ensure we have the latest custom claims (like roles)
        const tokenResult = await user.getIdTokenResult(true);
        setUserRole(tokenResult.claims.role || null);
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
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
