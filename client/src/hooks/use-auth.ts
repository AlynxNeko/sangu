import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  // Get current session
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        queryClient.setQueryData(['auth', 'user'], session?.user);
      } else if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(['auth', 'user'], null);
        queryClient.clear();
        setLocation('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient, setLocation]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    isLoading: isUserLoading,
    signOut,
    isAuthenticated: !!user,
  };
}
