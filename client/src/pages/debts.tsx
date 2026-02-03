import { useSplits } from "@/hooks/use-transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandCoins, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function DebtsPage() {
  const { data: splits } = useSplits();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-green-500/10 rounded-xl">
          <HandCoins className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Debts & Credits</h1>
          <p className="text-muted-foreground">Track who owes you money</p>
        </div>
      </div>

      {!splits?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <HandCoins className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">All settled up!</h3>
            <p className="text-muted-foreground">No pending debts found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {splits.map((item: any) => (
            <Card key={item.id} className="relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" title="Mark as Paid">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </Button>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">{item.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {item.split.original_transaction?.description || "Shared Bill"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between mt-2">
                   <div className="text-2xl font-bold text-green-500">
                    + Rp {Number(item.amount_owed).toLocaleString()}
                   </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                  {format(new Date(item.created_at), "dd MMM yyyy")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}