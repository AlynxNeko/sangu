import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PaymentMethod, InsertPaymentMethod } from "@shared/schema";

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment_methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as PaymentMethod[];
    },
  });
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (method: InsertPaymentMethod) => {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: method.userId,
          name: method.name,
          type: method.type,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_methods'] });
    }
  });
}