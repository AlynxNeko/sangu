import { useDashboardStats, useRecentTransactions } from "@/hooks/use-transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentTx, isLoading: txLoading } = useRecentTransactions();

  // Mock data for charts - replace with real aggregated data in production
  const chartData = [
    { name: 'Mon', income: 400000, expense: 240000 },
    { name: 'Tue', income: 300000, expense: 139800 },
    { name: 'Wed', income: 200000, expense: 980000 },
    { name: 'Thu', income: 278000, expense: 390800 },
    { name: 'Fri', income: 189000, expense: 480000 },
    { name: 'Sat', income: 239000, expense: 380000 },
    { name: 'Sun', income: 349000, expense: 430000 },
  ];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-gradient-gold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-lg">Your financial overview for this month</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Savings Rate:</span>
          <div className="px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold">
            {stats?.savingsRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-panel overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet className="w-24 h-24 text-primary" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display tracking-tight text-white mb-1">
                {formatCurrency(stats?.balance || 0)}
              </div>
              <p className="text-xs text-primary flex items-center mt-2">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.5% from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-panel border-l-4 border-l-primary/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-white mb-1 flex items-center">
                {formatCurrency(stats?.income || 0)}
                <div className="ml-auto p-2 bg-primary/10 rounded-full">
                  <ArrowUpRight className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-panel border-l-4 border-l-destructive/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display text-white mb-1 flex items-center">
                {formatCurrency(stats?.expenses || 0)}
                <div className="ml-auto p-2 bg-destructive/10 rounded-full">
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card/40 border-white/5">
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F5F749" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F5F749" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#666" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `Rp${(val/1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <Area type="monotone" dataKey="income" stroke="#F5F749" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                  <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card/40 border-white/5">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {recentTx?.map((tx, i) => (
                <div key={tx.id} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-primary/20 text-primary' : 'bg-muted text-foreground'
                    }`}>
                      {tx.category?.icon ? <span className="text-lg">{tx.category.icon}</span> : <CreditCard className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium leading-none group-hover:text-primary transition-colors">{tx.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(tx.transaction_date), "dd MMM yyyy")}</p>
                    </div>
                  </div>
                  <div className={`font-bold ${tx.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                  </div>
                </div>
              ))}
              
              {!recentTx?.length && (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <div className="grid gap-6 md:grid-cols-7">
        <Skeleton className="col-span-4 h-[350px] rounded-xl" />
        <Skeleton className="col-span-3 h-[350px] rounded-xl" />
      </div>
    </div>
  );
}
