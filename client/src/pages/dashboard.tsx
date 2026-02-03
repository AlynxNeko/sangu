import { useDashboardStats, useRecentTransactions, useBudgetsProgress, useIncomeRules } from "@/hooks/use-transactions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CreditCard, PieChart as PieIcon, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentTx, isLoading: txLoading } = useRecentTransactions();
  const { data: budgets, isLoading: budgetsLoading } = useBudgetsProgress();
  const { data: rules } = useIncomeRules();
  
  // State to toggle the Income Split Widget
  const [showAllocation, setShowAllocation] = useState(true);

  // Find active rule for the widget
  const activeRule = rules?.find(r => r.isActive);
  const allocationData = activeRule?.allocations?.map(a => ({
    name: a.category?.name || 'Unknown',
    value: Number(a.percentage),
    color: a.category?.color || '#8884d8'
  })) || [];

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
        <div className="flex items-center gap-6">
           {/* Allocation Toggle */}
          <div className="flex items-center space-x-2">
            <Switch id="show-alloc" checked={showAllocation} onCheckedChange={setShowAllocation} />
            <Label htmlFor="show-alloc" className="text-sm text-muted-foreground">Show Splits</Label>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Savings Rate:</span>
            <div className={`px-4 py-1.5 rounded-full border font-bold ${
              (stats?.savingsRate || 0) > 20 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
            }`}>
              {stats?.savingsRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard 
          title="Total Balance" 
          value={stats?.balance || 0} 
          icon={<Wallet className="w-24 h-24 text-primary" />}
          trend="+12.5% from last month"
          delay={0.1}
        />
        <StatsCard 
          title="Monthly Income" 
          value={stats?.income || 0} 
          icon={<ArrowUpRight className="w-4 h-4 text-primary" />}
          isIncome={true}
          delay={0.2}
        />
        <StatsCard 
          title="Monthly Expenses" 
          value={stats?.expenses || 0} 
          icon={<ArrowDownRight className="w-4 h-4 text-destructive" />}
          isIncome={false}
          isExpense={true}
          delay={0.3}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Main Chart Section */}
        <div className="col-span-full lg:col-span-4 space-y-6">
          {/* Cash Flow Chart */}
          <Card className="glass-panel border-white/5">
            <CardHeader>
              <CardTitle>Cash Flow (This Month)</CardTitle>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
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
                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp${(val/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <Area type="monotone" dataKey="income" stroke="#F5F749" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                    <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Budget Progress Section */}
          <Card className="glass-panel border-white/5">
             <CardHeader>
              <CardTitle>Budget Limits</CardTitle>
              <CardDescription>Track spending against category limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {budgets?.map((budget) => (
                <div key={budget.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <span className="text-lg">{budget.category?.icon}</span>
                      {budget.category?.name}
                    </span>
                    <span className={budget.percentage > 100 ? "text-destructive font-bold" : "text-muted-foreground"}>
                      {formatCurrency(budget.spent)} / {formatCurrency(Number(budget.amount))}
                    </span>
                  </div>
                  <Progress value={Math.min(budget.percentage, 100)} className={`h-2 ${budget.percentage > 100 ? "bg-destructive/20" : ""}`} indicatorClassName={budget.percentage > 90 ? "bg-destructive" : "bg-primary"} />
                </div>
              ))}
              {(!budgets || budgets.length === 0) && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No budgets set. Go to Settings to add limits.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Recent Transactions & Income Allocation */}
        <div className="col-span-full lg:col-span-3 space-y-6">
          
          {/* Income Allocation Widget (Conditional) */}
          {showAllocation && activeRule && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="glass-panel border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-primary" />
                    Income Allocation ({activeRule.name})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {allocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#333'} stroke="rgba(0,0,0,0)" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: '8px', border: '1px solid #333' }} itemStyle={{ color: '#fff' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {allocationData.map((item, i) => (
                       <div key={i} className="flex justify-between text-sm">
                         <span className="text-muted-foreground">{item.name}</span>
                         <span className="font-bold">{item.value}%</span>
                       </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Transactions */}
          <Card className="glass-panel border-white/5 h-fit">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {recentTx?.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'income' ? 'bg-primary/20 text-primary' : 'bg-muted text-foreground'
                      }`}>
                        {tx.category?.icon ? <span className="text-lg">{tx.category.icon}</span> : <CreditCard className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium leading-none group-hover:text-primary transition-colors">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(tx.transaction_date), "dd MMM")}</p>
                      </div>
                    </div>
                    <div className={`font-bold ${tx.type === 'income' ? 'text-primary' : 'text-foreground'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                    </div>
                  </div>
                ))}
                {!recentTx?.length && <div className="text-center py-8 text-muted-foreground">No recent transactions.</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, trend, isIncome, isExpense, delay }: any) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className={`glass-panel overflow-hidden relative ${isIncome ? 'border-l-4 border-l-primary/50' : isExpense ? 'border-l-4 border-l-destructive/50' : ''}`}>
        {!isIncome && !isExpense && (
          <div className="absolute top-0 right-0 p-4 opacity-10">{icon}</div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-display text-white mb-1 flex items-center">
            {formatCurrency(value)}
            {(isIncome || isExpense) && (
               <div className={`ml-auto p-2 rounded-full ${isIncome ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                 {icon}
               </div>
            )}
          </div>
          {trend && (
            <p className="text-xs text-primary flex items-center mt-2">
              <TrendingUp className="w-3 h-3 mr-1" /> {trend}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
      </div>
      <div className="grid gap-6 md:grid-cols-7">
        <Skeleton className="col-span-4 h-96" />
        <Skeleton className="col-span-3 h-96" />
      </div>
    </div>
  );
}