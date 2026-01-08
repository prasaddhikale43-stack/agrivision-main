"use client";

import { useUser, useAuth as useFirebaseAuth } from '@/firebase';

export const useAuth = () => {
  const { user, isUserLoading, userError } = useUser();
  const auth = useFirebaseAuth();
  return { user, loading: isUserLoading, error: userError, auth };
};
