import { useIncomeRules, useCreateIncomeRule, useToggleIncomeRule } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Plus, Trash2, Check, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AllocationsPage() {
  const { data: rules, isLoading } = useIncomeRules();
  const { data: categories } = useCategories();
  const createRule = useCreateIncomeRule();
  const toggleRule = useToggleIncomeRule();

  const [newRuleName, setNewRuleName] = useState("");
  const [allocations, setAllocations] = useState<{ categoryId: string, percentage: string }[]>([
    { categoryId: "", percentage: "" }
  ]);

  const handleAddAllocation = () => {
    setAllocations([...allocations, { categoryId: "", percentage: "" }]);
  };

  const handleRemoveAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const handleAllocationChange = (index: number, field: 'categoryId' | 'percentage', value: string) => {
    const newAllocations = [...allocations];
    newAllocations[index][field] = value;
    setAllocations(newAllocations);
  };

  const totalPercentage = allocations.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPercentage !== 100) {
        alert("Total percentage must equal 100%");
        return;
    }

    createRule.mutate({
        name: newRuleName,
        allocations: allocations.map(a => ({
        // Remove Number() conversion here
        categoryId: a.categoryId, 
        percentage: Number(a.percentage)
        }))
    }, {
        onSuccess: () => {
        setNewRuleName("");
        setAllocations([{ categoryId: "", percentage: "" }]);
        }
    });
    };

    const isFormInvalid = 
        !newRuleName || 
        totalPercentage !== 100 || 
        allocations.some(a => !a.categoryId || !a.percentage);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-4xl font-display font-bold text-gradient-gold">Income Allocations</h1>
        <p className="text-muted-foreground mt-1 text-lg">Define how your income should be split automatically.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* CREATE FORM */}
        <Card className="glass-panel border-primary/20">
          <CardHeader>
            <CardTitle>Create New Rule</CardTitle>
            <CardDescription>E.g., "Standard Paycheck" (50/30/20)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input 
                  placeholder="e.g. Monthly Salary Split" 
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  required 
                />
              </div>

              <div className="space-y-4">
                <Label className="flex justify-between">
                  <span>Allocations</span>
                  <span className={totalPercentage === 100 ? "text-emerald-500" : "text-destructive"}>
                    Total: {totalPercentage}%
                  </span>
                </Label>
                
                {allocations.map((alloc, index) => (
                  <div key={index} className="flex gap-2">
                    <Select 
                      value={alloc.categoryId} 
                      onValueChange={(val) => handleAllocationChange(index, 'categoryId', val)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.icon} {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="relative flex-1">
                      <Input 
                        type="number" 
                        placeholder="%" 
                        value={alloc.percentage}
                        onChange={(e) => handleAllocationChange(index, 'percentage', e.target.value)}
                        className="pl-8"
                      />
                      <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>

                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAllocation(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                
                <Button type="button" variant="outline" size="sm" onClick={handleAddAllocation} className="w-full border-dashed">
                  <Plus className="h-4 w-4 mr-2" /> Add Category
                </Button>
              </div>

              <Button type="submit" className="w-full" disabled={createRule.isPending || isFormInvalid}>
                {createRule.isPending ? "Saving..." : "Save Rule"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* EXISTING RULES LIST */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Your Rules</h2>
          {isLoading && <div className="text-muted-foreground">Loading rules...</div>}
          
          {rules?.map((rule) => (
            <Card key={rule.id} className={`transition-all ${rule.isActive ? 'border-primary bg-primary/5' : 'border-white/5'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`rule-${rule.id}`} className="text-xs text-muted-foreground">
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Label>
                    <Switch 
                      id={`rule-${rule.id}`} 
                      checked={rule.isActive || false}
                      onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, isActive: checked })} 
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rule.allocations?.map((alloc: any) => (
                    <div key={alloc.id} className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span>{alloc.category?.icon}</span>
                        {alloc.category?.name}
                      </span>
                      <span className="font-mono font-bold">{alloc.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {!rules?.length && !isLoading && (
            <div className="text-muted-foreground italic">No split rules created yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}