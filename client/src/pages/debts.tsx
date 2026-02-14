import { useSplits, useMarkSplitPaid } from "@/hooks/use-transactions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HandCoins, CheckCircle2, ChevronRight, User } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function DebtsPage() {
  const { data: splits } = useSplits();
  const markPaid = useMarkSplitPaid();
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  // Group splits by person name
  const debtsByPerson = splits?.reduce((acc: any, item: any) => {
    const name = item.name;
    if (!acc[name]) {
      acc[name] = {
        name,
        totalOwed: 0,
        items: []
      };
    }
    acc[name].totalOwed += Number(item.amount_owed);
    acc[name].items.push(item);
    return acc;
  }, {});

  const people = Object.values(debtsByPerson || {});

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-green-500/10 rounded-xl">
          <HandCoins className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Debts & Credits</h1>
          <p className="text-muted-foreground">Track who owes you money per person.</p>
        </div>
      </div>

      {!people.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <HandCoins className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">All settled up!</h3>
            <p className="text-muted-foreground">No pending debts found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {people.map((person: any) => (
            <Dialog key={person.name}>
              <DialogTrigger asChild>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      {person.name}
                    </CardTitle>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500 mt-2">
                      + Rp {person.totalOwed.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {person.items.length} pending transaction{person.items.length > 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Transactions with {person.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                  {person.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {item.split.original_transaction?.description || "Shared Bill"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "dd MMM yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-500 text-sm">
                          Rp {Number(item.amount_owed).toLocaleString()}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full hover:bg-green-500/10 hover:text-green-600"
                          title="Mark as Paid"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Mark ${item.amount_owed} from ${person.name} as paid?`)) {
                              markPaid.mutate(item.id);
                            }
                          }}
                          disabled={markPaid.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}