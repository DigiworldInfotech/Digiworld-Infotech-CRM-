import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, query, collection, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isAccountant: boolean;
  isSales: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isAccountant: false,
  isSales: false,
  isClient: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Check if there's a pre-registered profile by email
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnap = await getDocs(q);
          
          if (!querySnap.empty) {
            // Found a pre-registered profile
            const existingData = querySnap.docs[0].data() as UserProfile;
            const existingId = querySnap.docs[0].id;
            
            const linkedProfile: UserProfile = {
              ...existingData,
              uid: user.uid, // Link to real Firebase Auth UID
              photoURL: user.photoURL || existingData.photoURL,
            };
            
            // Delete the temporary record and create the real one
            await deleteDoc(doc(db, 'users', existingId));
            await setDoc(docRef, linkedProfile);
            setProfile(linkedProfile);
          } else {
            // Create default profile for first time login
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              name: user.displayName || 'User',
              role: user.email === 'admin@digiworldinfotech.in' ? 'super_admin' : (user.email === 'digiworldinfotechs@gmail.com' ? 'accountant' : 'sales'),
              photoURL: user.photoURL || undefined,
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        }

        // Initialize company settings if they don't exist
        const settingsRef = doc(db, 'settings', 'company');
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) {
          await setDoc(settingsRef, {
            name: 'DigiWorld Infotech',
            address: '123 Tech Street, Digital City',
            gstin: '27AAAAA0000A1Z5',
            state: 'Maharashtra',
            stateCode: '27',
            email: 'admin@digiworldinfotech.in',
            phone: '+91 98765 43210'
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'super_admin' || profile?.role === 'admin',
    isAccountant: profile?.role === 'accountant',
    isSales: profile?.role === 'sales',
    isClient: profile?.role === 'client',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
