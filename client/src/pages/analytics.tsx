import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTransactions } from "@/hooks/use-transactions";
import { Skeleton } from "@/components/ui/skeleton";

export default function Analytics() {
  const { data: transactions, isLoading } = useTransactions();

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

  // Aggregate by Category
  const expenseTx = transactions?.filter(t => t.type === 'expense') || [];
  const categoryData = expenseTx.reduce((acc, tx) => {
    const catName = tx.category?.name || 'Uncategorized';
    const existing = acc.find(c => c.name === catName);
    if (existing) {
      existing.value += Number(tx.amount);
    } else {
      acc.push({ name: catName, value: Number(tx.amount), color: tx.category?.color || '#888' });
    }
    return acc;
  }, [] as { name: string; value: number; color: string }[]);

  const COLORS = ['#F5F749', '#4ECDC4', '#FF6B6B', '#FFE66D', '#1A535C'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Analytics</h1>
        <p className="text-muted-foreground">Deep dive into your spending habits.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card/40 border-white/5">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                    formatter={(val: number) => `Rp${val.toLocaleString()}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-white/5">
          <CardHeader>
            <CardTitle>Top Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.sort((a, b) => b.value - a.value).slice(0, 5).map((cat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <span className="font-mono">Rp{cat.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
