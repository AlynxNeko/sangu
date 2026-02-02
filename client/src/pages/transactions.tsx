import { useTransactions, useDeleteTransaction } from "@/hooks/use-transactions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Search, Filter, Trash2, Receipt, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function Transactions() {
  const { data: transactions, isLoading } = useTransactions();
  const deleteTx = useDeleteTransaction();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const filtered = transactions?.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(search.toLowerCase()) || 
                          tx.category?.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-1">Manage and track your spending history.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card/30 p-4 rounded-2xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search transactions..." 
            className="pl-9 bg-background/50 border-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] bg-background/50 border-white/10">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <SelectValue placeholder="Filter Type" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">Loading transactions...</div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card/20 rounded-2xl border-dashed border border-white/10">
            No transactions found matching your criteria.
          </div>
        ) : (
          filtered?.map((tx) => (
            <div 
              key={tx.id} 
              className="group bg-card hover:bg-card/80 border border-white/5 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:border-primary/20 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Icon & Date */}
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                  tx.type === 'income' ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'
                }`}>
                  {tx.category?.icon ? <span className="text-xl">{tx.category.icon}</span> : <ArrowUpDown className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-none mb-1">{tx.description}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{format(new Date(tx.date), "dd MMM yyyy")}</span>
                    <span>•</span>
                    <span className="bg-white/5 px-2 py-0.5 rounded text-xs">{tx.category?.name || 'Uncategorized'}</span>
                    {tx.payment_method && (
                      <>
                        <span>•</span>
                        <span>{tx.payment_method.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0">
                <div className={`text-xl font-bold font-mono tracking-tight ${
                  tx.type === 'income' ? 'text-primary' : 'text-foreground'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {tx.receiptUrl && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent" onClick={() => window.open(tx.receiptUrl, '_blank')}>
                      <Receipt className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the transaction record.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTx.mutate(tx.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
