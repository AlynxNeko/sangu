import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema } from "@shared/schema";
import { useCreateRecurringTransaction, useCreateTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Upload, ScanLine, CheckCircle2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { Switch } from "@/components/ui/switch"; // Fixed import path
import { Checkbox } from "@radix-ui/react-checkbox";

// FIX 1: Robust Schema for String-to-Number Coercion
const formSchema = insertTransactionSchema
  .omit({ userId: true })
  .extend({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive number"),
    transactionDate: z.coerce.date(),
    categoryId: z.string().min(1, "Category is required"), 
    paymentMethodId: z.string().min(1, "Payment method is required"),
    frequency: z.string().optional(),
    startDate: z.string().optional(),
  });

export function TransactionModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Hooks
  const createTx = useCreateTransaction();
  const createRecurring = useCreateRecurringTransaction(); // Make sure this hook exists in your hooks file!
  
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  
  const [activeTab, setActiveTab] = useState("expense");
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      amount: "",
      description: "",
      transactionDate: new Date(), // Keep as Date object for z.coerce.date()
      categoryId: "",
      paymentMethodId: "",
      notes: "",
      receiptUrl: "",
      isSplit: false,
      frequency: "monthly",
      startDate: new Date().toISOString().split('T')[0]
    }
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      
      try {
        setIsUploading(true);
        setIsScanning(true);

        // 1. Upload to Supabase
        const fileName = `${user?.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('transaction-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('transaction-attachments')
          .getPublicUrl(fileName);
        
        form.setValue("receiptUrl", publicUrl);

        // 2. Trigger n8n Webhook
        const WEBHOOK_URL = "https://n8n.autoable.cloud/webhook/process-invoice"; 
        
        const formData = new FormData();
        formData.append('data', file);
        formData.append('user_id', user?.id || '');

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const res = await response.json();
          if (res.success && res.data) {
            const extracted = res.data;
            if (extracted.total) form.setValue("amount", String(extracted.total));
            if (extracted.description) form.setValue("description", extracted.description);
            if (extracted.notes) form.setValue("notes", extracted.notes);

            if (extracted.category && categories) {
              const matchedCat = categories.find(c => 
                c.name.toLowerCase().includes(extracted.category.toLowerCase())
              );
              if (matchedCat) {
                form.setValue("categoryId", matchedCat.id.toString());
                if (matchedCat.type !== activeTab) {
                  setActiveTab(matchedCat.type);
                  form.setValue("type", matchedCat.type);
                }
              }
            }

            if (extracted.payment_method && paymentMethods) {
              const matchedPm = paymentMethods.find(pm => 
                pm.name.toLowerCase().includes(extracted.payment_method.toLowerCase())
              );
              if (matchedPm) form.setValue("paymentMethodId", matchedPm.id.toString());
            }

            toast({ title: "Receipt Scanned!", description: `Found: ${extracted.description} (${extracted.total})` });
          }
        } else {
          toast({ title: "Scan warning", description: "Uploaded, but auto-fill failed.", variant: "destructive" });
        }
      } catch (e: any) {
        console.error(e);
        toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      } finally {
        setIsUploading(false);
        setIsScanning(false);
      }
    }
  });

  // FIX 2: Correct onSubmit Logic Branching
  const onSubmit = (data: any) => {
    // 1. Common Data Preparation
    const basePayload = {
      amount: data.amount,
      categoryId: Number(data.categoryId),
      paymentMethodId: Number(data.paymentMethodId),
      description: data.description,
      notes: data.notes,
      receiptUrl: data.receiptUrl,
      userId: user?.id,
      type: activeTab,
    };

    if (isRecurring) {
      // === BRANCH A: RECURRING TRANSACTION ===
      // Check for required recurring fields
      if (!data.frequency || !data.startDate) {
        toast({ title: "Missing Fields", description: "Frequency and Start Date are required.", variant: "destructive" });
        return;
      }

      const recurringPayload = {
        ...basePayload,
        frequency: data.frequency,
        startDate: data.startDate, // Pass the string directly "YYYY-MM-DD"
      };

      createRecurring.mutate(recurringPayload, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });

    } else {
      // === BRANCH B: ONE-TIME TRANSACTION ===
      const transactionPayload = {
        ...basePayload,
        // The hook likely expects 'date' or 'transactionDate' depending on implementation
        // Assuming your hook expects 'date' based on standard practice:
        date: data.transactionDate.toISOString(), 
        isSplit: data.isSplit
      };

      createTx.mutate(transactionPayload, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-xl border-white/10 p-0 overflow-hidden gap-0">
        <div className="p-6 pb-0">
          <DialogTitle className="text-2xl font-display mb-4">New Transaction</DialogTitle>
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); form.setValue("type", val); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 mb-6">
              <TabsTrigger value="expense" className="data-[state=active]:bg-destructive data-[state=active]:text-white transition-all">Expense</TabsTrigger>
              <TabsTrigger value="income" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Income</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
          <Form {...form}>
            {/* ... [Rest of your UI/JSX remains exactly the same] ... */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Dropzone */}
              <div {...getRootProps()} className={`border-2 border-dashed transition-all rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer ${isScanning ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 bg-muted/20'}`}>
                <input {...getInputProps()} />
                {isUploading || isScanning ? (
                  <div className="flex flex-col items-center animate-pulse">
                    <ScanLine className="h-10 w-10 text-primary mb-2" />
                    <p className="text-sm font-medium text-primary">Scanning Receipt...</p>
                  </div>
                ) : form.getValues("receiptUrl") ? (
                  <div className="relative w-full group">
                    <img src={form.getValues("receiptUrl") || ""} alt="Receipt" className="h-32 object-contain mx-auto rounded-md shadow-sm" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                      <p className="text-white text-xs font-medium">Click to replace</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Drop receipt to scan</p>
                  </>
                )}
              </div>

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-muted-foreground font-medium">Rp</span>
                        <Input placeholder="0" className="pl-10 text-lg font-medium" {...field} type="number" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Recurring Toggle - MOVED UP for better UX (Optional) or keep at bottom */}
              <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Recurring Transaction?</FormLabel>
                  <p className="text-sm text-muted-foreground">Automatically create this {activeTab} periodically</p>
                </div>
                <FormControl>
                  <Switch
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                </FormControl>
              </div>

              {isRecurring ? (
                // RECURRING FIELDS
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue="monthly">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                           <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                // STANDARD DATE FIELD
                <FormField
                  control={form.control}
                  name="transactionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        {/* Ensure value is formatted for date input YYYY-MM-DD */}
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Category & Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.filter(c => c.type === activeTab).map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              <span className="flex items-center gap-2">
                                <span>{c.icon}</span> {c.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethodId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Paid via..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentMethods?.map(pm => (
                            <SelectItem key={pm.id} value={pm.id.toString()}>{pm.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Lunch at McD" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Split Bill Toggle */}
              <FormField
                control={form.control}
                name="isSplit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Split this bill?</FormLabel>
                      <FormDescription>
                        Share this cost with friends
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Show Friends Input only if isSplit is checked */}
              {form.watch("isSplit") && (
                <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                  <h4 className="font-medium text-sm">Who are you splitting with?</h4>
                  {/* You would need to add logic here to add/remove friends dynamically */}
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Friend Name" />
                    <Input placeholder="Amount (Rp)" type="number" />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full">
                    + Add Friend
                  </Button>
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add details..." className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={createTx.isPending || createRecurring.isPending || isUploading || isScanning}
                >
                  {createTx.isPending || createRecurring.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                  {isRecurring ? "Schedule Recurring" : "Save Transaction"}
                </Button>
              </div>

            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}