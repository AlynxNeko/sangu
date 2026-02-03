import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { InsertTransaction, Transaction } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface CreateTransactionPayload extends InsertTransaction {
  splitDetails?: {
    totalAmount: number;
    participants: { name: string; amount: number }[];
  };
}

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
        .order('transaction_date', { ascending: false });
      
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

interface CreateTransactionPayload extends InsertTransaction {
  splitDetails?: {
    totalAmount: number;
    participants: { name: string; amount: number }[];
  };
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transaction: CreateTransactionPayload) => {
      console.log("Creating transaction:", transaction);

      // 1. Insert the Main Transaction (Your Share Only)
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: transaction.userId,
          type: transaction.type,
          amount: String(transaction.amount || 0), // Safe string conversion
          category_id: transaction.categoryId ? Number(transaction.categoryId) : null,
          payment_method_id: transaction.paymentMethodId ? Number(transaction.paymentMethodId) : null,
          description: transaction.description,
          transaction_date: transaction.transactionDate, 
          receipt_url: transaction.receiptUrl,
          notes: transaction.notes,
          is_split: transaction.isSplit,
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2. If Split, Insert Split Details
      // FIX: Check if splitDetails exists properly
      if (transaction.isSplit && transaction.splitDetails) {
        console.log("Processing split:", transaction.splitDetails);
        
        // A. Create the Split Record
        const { data: splitData, error: splitError } = await supabase
          .from('transaction_splits')
          .insert({
            transaction_id: txData.id,
            // FIX: Safe string conversion for totalAmount
            total_amount: String(transaction.splitDetails.totalAmount || 0), 
          })
          .select()
          .single();

        if (splitError) throw splitError;

        // B. Add Participants
        if (transaction.splitDetails.participants?.length > 0) {
          const participantsPayload = transaction.splitDetails.participants.map(p => ({
            split_id: splitData.id,
            name: p.name,
            // FIX: Safe string conversion for amount
            amount_owed: String(p.amount || 0),
            is_paid: false
          }));

          const { error: partError } = await supabase
            .from('split_participants')
            .insert(participantsPayload);

          if (partError) throw partError;
        }
      }

      return txData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['splits'] });
      toast({
        title: "Transaction Saved",
        description: "Transaction and split details recorded.",
      });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

export function useSplits() {
  return useQuery({
    queryKey: ['splits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('split_participants')
        .select(`
          *,
          split:transaction_splits (
            total_amount,
            original_transaction:transactions (
              description,
              transaction_date
            )
          )
        `)
        .eq('is_paid', false);
      
      if (error) throw error;
      return data;
    }
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => { // Changed ID to string (UUID)
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

