import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { Loader2, Plus, Tag } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function CategoriesPage() {
    const { user } = useAuth();
    const userId = user?.id;

    const { data: categories, isLoading } = useCategories();
    const createCategory = useCreateCategory();

    const [name, setName] = useState("");
    const [type, setType] = useState("expense");
    const [icon, setIcon] = useState("🍔"); // Default icon

    const handleAdd = () => {
        if (!name || !userId) return;
        createCategory.mutate({
            userId,
            name,
            type,
            icon,
            color: "#ffffff",
            isCustom: true
        }, {
            onSuccess: () => setName("")
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-display font-bold">Categories</h1>
                <p className="text-muted-foreground">Manage your expense and income categories.</p>
            </div>

            <Card className="glass-panel">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5" /> Manage Categories</CardTitle>
                    <CardDescription>Create categories to organize your transactions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Add New Category Form */}
                    <div className="flex gap-4 items-end bg-muted/30 p-4 rounded-lg">
                        <div className="space-y-2 flex-1">
                            <Label>Category Name</Label>
                            <Input placeholder="e.g. Street Food" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2 w-32">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="income">Income</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 w-20">
                            <Label>Icon</Label>
                            <Input value={icon} onChange={e => setIcon(e.target.value)} className="text-center" />
                        </div>
                        <Button onClick={handleAdd} disabled={createCategory.isPending}>
                            {createCategory.isPending ? <Loader2 className="animate-spin" /> : <Plus className="w-4 h-4" />}
                        </Button>
                    </div>

                    {/* List Categories */}
                    <div className="space-y-2">
                        <Label>Existing Categories</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {isLoading ? <Loader2 className="animate-spin" /> : categories?.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-md bg-card/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg">{cat.icon}</div>
                                        <div>
                                            <div className="font-medium">{cat.name}</div>
                                            <div className="text-xs text-muted-foreground capitalize">{cat.type}</div>
                                        </div>
                                    </div>
                                    {/* Add Delete button logic here if needed */}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
