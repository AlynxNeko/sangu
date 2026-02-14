import { useIncomeRules, useCreateIncomeRule, useToggleIncomeRule } from "@/hooks/use-transactions";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Heart, TrendingUp, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function SavingsPage() {
    const { data: rules } = useIncomeRules();
    const { data: paymentMethods } = usePaymentMethods();
    const createRule = useCreateIncomeRule();
    const { toast } = useToast();

    // We assume there's one active rule we are editing, or we create a new one.
    // For simplicity in this version, we'll try to find the active rule and edit it.
    // In a real app, we might need a specific "Settings" endpoint or just pick the first active one.

    const activeRule = rules?.find((r: any) => r.is_active);

    // Tithe State
    const [isTitheEnabled, setIsTitheEnabled] = useState(false);
    const [tithePercentage, setTithePercentage] = useState("10");

    // Savings State
    const [isSavingsEnabled, setIsSavingsEnabled] = useState(false);
    const [savingsPercentage, setSavingsPercentage] = useState("20");

    // Investment Split State
    const [savingsCorePercentage, setSavingsCorePercentage] = useState("90");
    const [savingsSatellitePercentage, setSavingsSatellitePercentage] = useState("10");
    const [coreMethodId, setCoreMethodId] = useState<string>("");
    const [satelliteMethodId, setSatelliteMethodId] = useState<string>("");

    // Load state from active rule
    useEffect(() => {
        if (activeRule) {
            setIsTitheEnabled(activeRule.is_tithe_enabled);
            setTithePercentage(String(activeRule.tithe_percentage));
            setIsSavingsEnabled(activeRule.is_savings_enabled);
            setSavingsPercentage(String(activeRule.savings_percentage));
            setSavingsCorePercentage(String(activeRule.savings_core_percentage));
            setSavingsSatellitePercentage(String(activeRule.savings_satellite_percentage));
            if (activeRule.savings_core_payment_method_id) setCoreMethodId(String(activeRule.savings_core_payment_method_id));
            if (activeRule.savings_satellite_payment_method_id) setSatelliteMethodId(String(activeRule.savings_satellite_payment_method_id));
        }
    }, [activeRule]);

    // Calculate example split based on 10,000,000 input
    const exampleIncome = 10000000;
    const titheAmount = isTitheEnabled ? exampleIncome * (Number(tithePercentage) / 100) : 0;
    const savingsAmount = isSavingsEnabled ? exampleIncome * (Number(savingsPercentage) / 100) : 0;

    const coreAmount = savingsAmount * (Number(savingsCorePercentage) / 100);
    const satelliteAmount = savingsAmount * (Number(savingsSatellitePercentage) / 100);

    const handleSave = () => {
        // We are creating a NEW rule for now because our backend `createRule` handles creation.
        // Ideally we would have an update endpoint, but `createRule` can act as "Apply New Strategy"

        // Check validation
        if (isSavingsEnabled && (!coreMethodId || !satelliteMethodId)) {
            toast({ title: "Configuration Error", description: "Please select target accounts for Core and Satellite savings.", variant: "destructive" });
            return;
        }

        createRule.mutate({
            name: activeRule?.name || "Main Strategy", // Reuse name or default
            isTitheEnabled,
            tithePercentage: Number(tithePercentage),
            isSavingsEnabled,
            savingsPercentage: Number(savingsPercentage),
            savingsCorePercentage: Number(savingsCorePercentage),
            savingsSatellitePercentage: Number(savingsSatellitePercentage),
            savingsCorePaymentMethodId: coreMethodId ? Number(coreMethodId) : null,
            savingsSatellitePaymentMethodId: satelliteMethodId ? Number(satelliteMethodId) : null,
            // Preserve existing allocations if possible, or send empty? 
            // The current createRule implementation requires allocations to be sent or they are lost/empty.
            // For this "Split Page" approach, we should probably fetch existing allocations and re-send them.
            allocations: activeRule?.allocations?.map((a: any) => ({
                categoryId: a.category_id,
                percentage: Number(a.percentage)
            })) || []
        }, {
            onSuccess: () => {
                toast({ title: "Savings Configured", description: "Your savings rules have been updated." });
            }
        });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-10">
            <div>
                <h1 className="text-4xl font-display font-bold text-gradient-gold">Savings & Tithe</h1>
                <p className="text-muted-foreground mt-1 text-lg">Configure your "Pay Yourself First" rules.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                    <Card className="glass-panel border-primary/20">
                        <CardHeader>
                            <CardTitle>Configuration</CardTitle>
                            <CardDescription>These are deducted from Income FIRST.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* TITHE */}
                            <div className="flex items-start justify-between border-l-2 border-rose-500/50 pl-4 py-2 bg-rose-500/5 rounded-r-lg">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 font-medium">
                                        <Heart className="w-5 h-5 text-rose-500" />
                                        Perpuluhan / Tithe
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isTitheEnabled && (
                                        <div className="relative w-20">
                                            <Input
                                                value={tithePercentage}
                                                onChange={e => setTithePercentage(e.target.value)}
                                                className="h-8 pr-6 text-right"
                                            />
                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
                                        </div>
                                    )}
                                    <Switch checked={isTitheEnabled} onCheckedChange={setIsTitheEnabled} />
                                </div>
                            </div>

                            <div className="flex items-start justify-between border-l-2 border-emerald-500/50 pl-4 py-2 bg-emerald-500/5 rounded-r-lg">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 font-medium">
                                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                                        Savings
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isSavingsEnabled && (
                                        <div className="relative w-20">
                                            <Input
                                                value={savingsPercentage}
                                                onChange={e => setSavingsPercentage(e.target.value)}
                                                className="h-8 pr-6 text-right"
                                            />
                                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
                                        </div>
                                    )}
                                    <Switch checked={isSavingsEnabled} onCheckedChange={setIsSavingsEnabled} />
                                </div>
                            </div>

                            {isSavingsEnabled && (
                                <div className="pl-4 space-y-4 border-l-2 border-emerald-500/20 ml-1 animate-in slide-in-from-top-2">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs font-bold text-emerald-400">Core Portfolio ({savingsCorePercentage}%)</Label>
                                                {coreMethodId && <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted">Active</span>}
                                            </div>
                                            <Select value={coreMethodId} onValueChange={setCoreMethodId}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Select Target (e.g. Bibit)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {paymentMethods?.map(pm => (
                                                        <SelectItem key={pm.id} value={String(pm.id)}>{pm.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="range"
                                                min="0" max="100"
                                                step="5"
                                                value={savingsCorePercentage}
                                                onChange={e => {
                                                    setSavingsCorePercentage(e.target.value);
                                                    setSavingsSatellitePercentage(String(100 - Number(e.target.value)));
                                                }}
                                                className="h-2 cursor-pointer"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs font-bold text-blue-400">Satellite Portfolio ({savingsSatellitePercentage}%)</Label>
                                                {satelliteMethodId && <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted">Active</span>}
                                            </div>
                                            <Select value={satelliteMethodId} onValueChange={setSatelliteMethodId}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Select Target (e.g. Stockbit)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {paymentMethods?.map(pm => (
                                                        <SelectItem key={pm.id} value={String(pm.id)}>{pm.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="range"
                                                min="0" max="100"
                                                step="5"
                                                value={savingsSatellitePercentage}
                                                onChange={e => {
                                                    setSavingsSatellitePercentage(e.target.value);
                                                    setSavingsCorePercentage(String(100 - Number(e.target.value)));
                                                }}
                                                className="h-2 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Button onClick={handleSave} className="w-full text-lg h-12" disabled={createRule.isPending}>
                                {createRule.isPending ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Update Configuration</>}
                            </Button>

                        </CardContent>
                    </Card>
                </div>

                {/* PREVIEW */}
                <div className="space-y-6">
                    <Card className="bg-muted/20 border-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Simulation (Rp 10,000,000 Income)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-base">
                                <span>Gross Income</span>
                                <span className="font-mono">10,000,000</span>
                            </div>
                            <Separator />
                            {isTitheEnabled && (
                                <div className="flex justify-between text-sm text-rose-500 font-medium">
                                    <span className="flex items-center gap-2"><Heart className="w-3 h-3" /> Tithe ({tithePercentage}%)</span>
                                    <span className="font-mono">- {titheAmount.toLocaleString()}</span>
                                </div>
                            )}
                            {isSavingsEnabled && (
                                <div className="flex justify-between text-sm text-emerald-500 font-medium">
                                    <span className="flex items-center gap-2"><TrendingUp className="w-3 h-3" /> Savings ({savingsPercentage}%)</span>
                                    <span className="font-mono">- {savingsAmount.toLocaleString()}</span>
                                </div>
                            )}
                            {isSavingsEnabled && savingsAmount > 0 && (
                                <div className="pl-6 text-xs text-muted-foreground space-y-2 border-l border-emerald-500/20 py-1 my-1">
                                    <div className="flex justify-between">
                                        <span>Core ({savingsCorePercentage}%)</span>
                                        <span className="text-foreground">{coreAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Satellite ({savingsSatellitePercentage}%)</span>
                                        <span className="text-foreground">{satelliteAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            <Separator className="bg-white/10" />
                            <div className="flex justify-between font-bold text-lg pt-2">
                                <span>Net Available</span>
                                <span className="font-mono text-primary">{(exampleIncome - titheAmount - savingsAmount).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
