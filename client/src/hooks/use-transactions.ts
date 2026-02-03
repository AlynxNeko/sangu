import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { InsertTransaction, Transaction } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";

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
      if (transaction.isSplit && transaction.splitDetails) {
        console.log("Processing split:", transaction.splitDetails);
        
        // A. Create the Split Record
        const { data: splitData, error: splitError } = await supabase
          .from('transaction_splits')
          .insert({
            transaction_id: txData.id,
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
      queryClient.invalidateQueries({ queryKey: ['budgets'] }); 
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
    mutationFn: async (id: string) => { 
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
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      
      // 1. Fetch transactions for this month
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type, transaction_date')
        .gte('transaction_date', start.toISOString())
        .lte('transaction_date', end.toISOString());

      if (error) throw error;

      // 2. Calculate Totals
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const balance = income - expenses;
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

      // 3. Generate Chart Data
      const days = eachDayOfInterval({ start, end: now });

      const chartData = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayTxs = transactions.filter(t => 
          t.transaction_date.startsWith(dateStr)
        );

        return {
          name: format(day, 'd MMM'), 
          fullDate: dateStr,
          income: dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
          expense: dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
        };
      });

      return {
        income,
        expenses,
        balance,
        savingsRate,
        chartData
      };
    }
  });
}

// --- BUDGETS PROGRESS ---

export function useBudgetsProgress() {
  return useQuery({
    queryKey: ['budgets', 'progress'],
    queryFn: async () => {
      const now = new Date();
      const start = startOfMonth(now).toISOString();

      // 1. Fetch Budgets with Categories
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select(`*, category:categories(*)`);
      
      if (budgetError) throw budgetError;

      // 2. Fetch Expenses for this month
      const { data: expenses, error: expenseError } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('type', 'expense')
        .gte('transaction_date', start);

      if (expenseError) throw expenseError;

      // 3. Match Budget to Actual Spending
      const budgetProgress = budgets.map(budget => {
        const spent = expenses
          .filter(e => e.category_id === budget.category_id)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        
        const total = Number(budget.amount);
        const percentage = total > 0 ? (spent / total) * 100 : 0;

        return {
          ...budget,
          spent,
          percentage
        };
      });

      return budgetProgress;
    }
  });
}

// --- INCOME ALLOCATION (SPLITTING) ---

export function useIncomeRules() {
  return useQuery({
    queryKey: ['income_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('income_split_rules')
        .select(`
          *,
          allocations:income_split_allocations(
            *,
            category:categories(*)
          )
        `)
        // FIX: Sort by created_at or name instead of id (UUID) to prevent random list jumping
        .order('name', { ascending: true }); 
      if (error) throw error;
      return data;
    }
  });
}

export function useCreateIncomeRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string, allocations: { categoryId: number, percentage: number }[] }) => {
      // 1. Create Rule
      const { data: rule, error: ruleError } = await supabase
        .from('income_split_rules')
        .insert({ name: data.name, user_id: (await supabase.auth.getUser()).data.user?.id })
        .select()
        .single();
      
      if (ruleError) throw ruleError;

      // 2. Create Allocations
      if (data.allocations.length > 0) {
        const allocationPayload = data.allocations.map(a => ({
          rule_id: rule.id,
          category_id: a.categoryId,
          percentage: String(a.percentage)
        }));

        const { error: allocError } = await supabase
          .from('income_split_allocations')
          .insert(allocationPayload);
        
        if (allocError) throw allocError;
      }
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income_rules'] });
      toast({ title: "Rule Created", description: "Income split rule saved." });
    }
  });
}

export function useToggleIncomeRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string | number, isActive: boolean }) => {
      // First, set all to false if we are activating one (Radio Button behavior)
      if (isActive) {
        // Safe query compatible with both UUID and Integer IDs
        await supabase.from('income_split_rules').update({ is_active: false }).not('id', 'is', null);
      }
      
      // Then set the specific one
      const { error } = await supabase
        .from('income_split_rules')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income_rules'] });
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
        frequency: data.frequency, 
        start_date: data.startDate,
        next_occurrence: data.startDate, 
        auto_create: true, 
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