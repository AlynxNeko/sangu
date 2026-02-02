import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useCreateCategory } from "@/hooks/use-categories";
import { usePaymentMethods, useCreatePaymentMethod } from "@/hooks/use-payment-methods";
import { Loader2, Plus, Trash2, Wallet, Tag } from "lucide-react";

export default function Settings() {
  const { user, signOut } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account, categories, and payment methods.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email} disabled className="bg-muted" />
              </div>
              <Button variant="destructive" onClick={() => signOut()}>Sign Out</Button>
            </CardContent>
          </Card>
          
          <Card className="glass-panel">
             <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Always on for that premium look</p>
                </div>
                <Switch checked disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Management Tab */}
        <TabsContent value="categories">
          <CategoryManager userId={user?.id} />
        </TabsContent>

        {/* Payment Methods Management Tab */}
        <TabsContent value="payment">
          <PaymentMethodManager userId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoryManager({ userId }: { userId: string | undefined }) {
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
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Tag className="w-5 h-5"/> Manage Categories</CardTitle>
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
  );
}

function PaymentMethodManager({ userId }: { userId: string | undefined }) {
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
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5"/> Payment Methods</CardTitle>
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
  );
}