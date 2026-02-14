import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaymentMethods, useCreatePaymentMethod } from "@/hooks/use-payment-methods";
import { Loader2, Plus, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function PaymentMethodsPage() {
    const { user } = useAuth();
    const userId = user?.id;

    const { data: methods, isLoading } = usePaymentMethods();
    const createMethod = useCreatePaymentMethod();
    const [name, setName] = useState("");
    const [type, setType] = useState("e_wallet");

    const handleAdd = () => {
        if (!name || !userId) return;
        createMethod.mutate({
            userId,
            name,
            type,
            isActive: true
        }, {
            onSuccess: () => setName("")
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-display font-bold">Payment Methods</h1>
                <p className="text-muted-foreground">Manage your wallets, bank accounts, and cards.</p>
            </div>

            <Card className="glass-panel">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Payment Methods</CardTitle>
                    <CardDescription>Add wallets, banks, or cash accounts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-4 items-end bg-muted/30 p-4 rounded-lg">
                        <div className="space-y-2 flex-1">
                            <Label>Method Name</Label>
                            <Input placeholder="e.g. GoPay, BCA, Cash" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2 w-48">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="e_wallet">E-Wallet</SelectItem>
                                    <SelectItem value="bank_transfer">Bank</SelectItem>
                                    <SelectItem value="credit_card">Credit Card</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleAdd} disabled={createMethod.isPending}>
                            {createMethod.isPending ? <Loader2 className="animate-spin" /> : <Plus className="w-4 h-4" />}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {isLoading ? <Loader2 className="animate-spin" /> : methods?.map((pm) => (
                            <div key={pm.id} className="p-3 border rounded-md flex justify-between items-center">
                                <span className="font-medium">{pm.name}</span>
                                <span className="text-xs px-2 py-1 rounded bg-muted uppercase">{pm.type.replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
