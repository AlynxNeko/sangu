import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function Recurring() {
  const queryClient = useQueryClient();

  // Fetch Recurring Data
  const { data: recurring } = useQuery({
    queryKey: ['recurring'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recurring_transactions').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring'] })
  });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-display font-bold">Recurring Bills</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recurring?.map((item) => (
          <Card key={item.id} className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">{item.description}</CardTitle>
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp {Number(item.amount).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Repeats: <span className="text-primary capitalize">{item.frequency}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Next due: {format(new Date(item.next_occurrence), "dd MMM yyyy")}
              </p>
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => deleteMutation.mutate(item.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Stop Recurring
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}