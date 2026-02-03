import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { InsertTransaction, Transaction } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, color, icon),
          payment_method:payment_methods(name)
        `)
        .order('transaction_date', { ascending: false }); // Fixed: 'date' -> 'transaction_date'
      
      if (error) throw error;
      return data;
    },
  });
}

export function useRecentTransactions(limit = 5) {
  return useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, color, icon)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transaction: InsertTransaction) => {
      // Map camelCase to snake_case for Supabase
      const payload = {
        user_id: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        category_id: transaction.categoryId,
        payment_method_id: transaction.paymentMethodId,
        description: transaction.description,
        transaction_date: transaction.transactionDate, // Fixed: 'date' -> 'transaction_date' & 'transaction.date' -> 'transaction.transactionDate'
        receipt_url: transaction.receiptUrl,
        notes: transaction.notes,
        is_split: transaction.isSplit,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Transaction added",
        description: "Your transaction has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Deleted",
        description: "Transaction removed successfully.",
      });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .gte('transaction_date', firstDay); // Fixed: 'date' -> 'transaction_date'

      if (error) throw error;

      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const balance = income - expenses;
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

      return {
        income,
        expenses,
        balance,
        savingsRate
      };
    }
  });
}

export function useCreateRecurringTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      // Map frontend data to Supabase columns
      const payload = {
        user_id: data.userId,
        type: data.type,
        amount: data.amount,
        category_id: data.categoryId,
        payment_method_id: data.paymentMethodId,
        description: data.description,
        frequency: data.frequency, // e.g., 'monthly', 'weekly'
        start_date: data.startDate,
        next_occurrence: data.startDate, // First run is the start date
        auto_create: true, // This tells n8n to process it
        is_active: true
      };

      const { data: result, error } = await supabase
        .from('recurring_transactions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_transactions'] });
      toast({ title: "Recurring Scheduled", description: "Automation set up successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}
