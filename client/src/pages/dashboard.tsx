import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDashboardStats, useRecentTransactions, useBudgetsProgress, useIncomeRules } from "@/hooks/use-transactions";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  Percent,
  Split,
  Heart
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: recentTransactions } = useRecentTransactions();
  const { data: budgets } = useBudgetsProgress();
  const { data: rules } = useIncomeRules();

  // Find the currently active rule
  const activeRule = rules?.find(r => r.is_active);

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading financial data...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold text-gradient-gold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-lg">Overview of your financial health.</p>
        </div>
      </div>

      {/* STATS CARDS (Unchanged) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-panel border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.balance.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current month cash flow</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Income</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              +{stats?.income.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total incoming</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              -{stats?.expenses.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total spending</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats?.savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Target: 20%</p>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: CHART & BUDGETS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 glass-panel">
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
            <CardDescription>Income vs Expenses over time</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151' }}
                    itemStyle={{ color: '#f3f4f6' }}
                    formatter={(value: number) => value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 glass-panel">
          <CardHeader>
            <CardTitle>Budget Limits</CardTitle>
            <CardDescription>Monthly limits per category</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-6">
                {budgets?.map((budget) => (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{budget.category?.icon}</span>
                        <span className="font-medium">{budget.category?.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {Number(budget.spent).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                        <span className="mx-1">/</span>
                        {Number(budget.amount).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <Progress
                      value={budget.percentage}
                      className={`h-2 ${budget.percentage > 100 ? 'bg-red-900' : ''}`}
                      indicatorClassName={budget.percentage > 100 ? 'bg-red-500' : budget.percentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}
                    />
                  </div>
                ))}
                {!budgets?.length && (
                  <div className="text-muted-foreground text-center py-8">No budgets set for this month.</div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: INCOME ALLOCATION & TRANSACTIONS */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* NEW: INCOME ALLOCATION WIDGET */}
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Income Split</CardTitle>
              <CardDescription>
                {activeRule ? `Rule: ${activeRule.name}` : "No active rule set"}
              </CardDescription>
            </div>
            <Link href="/allocations">
              <Button variant="ghost" size="icon">
                <Split className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activeRule ? (
              <div className="space-y-5">
                {/* 1. TITHE & SAVINGS (From GROSS) */}
                {activeRule.is_tithe_enabled && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-rose-500">
                        <Heart className="w-4 h-4" />
                        Perpuluhan / Tithe
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-500">
                          {((Number(activeRule.tithe_percentage) / 100) * (stats?.income || 0)).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {activeRule.tithe_percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress value={Number(activeRule.tithe_percentage)} className="h-1.5 bg-rose-500/20" indicatorClassName="bg-rose-500" />
                  </div>
                )}

                {activeRule.is_savings_enabled && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-emerald-500">
                        <TrendingUp className="w-4 h-4" />
                        Savings & Investments
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-500">
                          {((Number(activeRule.savings_percentage) / 100) * (stats?.income || 0)).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {activeRule.savings_percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress value={Number(activeRule.savings_percentage)} className="h-1.5 bg-emerald-500/20" indicatorClassName="bg-emerald-500" />
                  </div>
                )}

                {(activeRule.is_tithe_enabled || activeRule.is_savings_enabled) && <div className="border-t border-white/5 my-2" />}

                {/* 2. CATEGORY ALLOCATIONS (From NET) */}
                {activeRule.allocations?.map((alloc: any) => {
                  // Calculate Net Income
                  const gross = stats?.income || 0;
                  const tithe = activeRule.is_tithe_enabled ? gross * (Number(activeRule.tithe_percentage) / 100) : 0;
                  const savings = activeRule.is_savings_enabled ? gross * (Number(activeRule.savings_percentage) / 100) : 0;
                  const netIncome = gross - tithe - savings;

                  // Calculate amount based on NET income
                  const amount = (Number(alloc.percentage) / 100) * netIncome;

                  // For visual progress bar relative to GROSS (to show true scale? or relative to Net?)
                  // User likely wants to see the split of the remaining chunk. 
                  // Let's keep the progress bar showing the allocation percentage (of Net), but maybe specificy it is of Net.

                  return (
                    <div key={alloc.id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span>{alloc.category?.icon}</span>
                          {alloc.category?.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">
                            {amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {alloc.percentage}%
                          </span>
                        </div>
                      </div>
                      <Progress value={Number(alloc.percentage)} className="h-1.5" indicatorClassName="bg-primary/50" />
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-white/5 text-xs text-center text-muted-foreground">
                  Based on actual monthly income: {stats?.income.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <Percent className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm max-w-[200px]">
                  Set up an income rule to automatically calculate how to split your pay.
                </p>
                <Link href="/allocations">
                  <Button variant="outline" size="sm">Configure Allocations</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* EXISTING: RECENT TRANSACTIONS */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions?.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                      {tx.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{tx.description}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(tx.transaction_date), "dd MMM")} • {tx.category?.name}</div>
                    </div>
                  </div>
                  <div className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                  </div>
                </div>
              ))}
              {!recentTransactions?.length && (
                <div className="text-muted-foreground text-center py-6 italic">No recent transactions.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}