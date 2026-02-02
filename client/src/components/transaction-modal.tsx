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
import { insertTransactionSchema, transactions } from "@shared/schema";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Upload, ScanLine, CheckCircle2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

// FIX 1: Robust Schema for String-to-Number Coercion
const formSchema = insertTransactionSchema
  .omit({ userId: true }) // <--- This tells the form "Don't validate userId, I'll handle it"
  .extend({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive number"),
    transactionDate: z.coerce.date(),
    categoryId: z.string().min(1, "Category is required"), 
    paymentMethodId: z.string().min(1, "Payment method is required"),
  });

export function TransactionModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createTx = useCreateTransaction();
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  
  const [activeTab, setActiveTab] = useState("expense");
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      amount: "",
      description: "",
      transactionDate: new Date().toISOString().split('T')[0],
      categoryId: "",      // Changed from 0
      paymentMethodId: "", // Changed from 0
      notes: "",
      receiptUrl: "",
      isSplit: false,
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

        // 1. Upload to Supabase (for storage record)
        const fileName = `${user?.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('transaction-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('transaction-attachments')
          .getPublicUrl(fileName);
        
        form.setValue("receiptUrl", publicUrl);

        // 2. Trigger n8n Webhook (Direct File Upload)
        // Using the URL provided in your prompt
        const WEBHOOK_URL = "https://n8n.autoable.cloud/webhook/process-invoice"; 
        
        const formData = new FormData();
        formData.append('data', file); // Matches -F "data=@..."
        formData.append('user_id', user?.id || '');

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          body: formData, // Browser automatically sets multipart/form-data header
        });
        
        if (response.ok) {
          const res = await response.json();
          // Expected format: { "success": true, "data": { "total": 22324, "category": "...", ... } }
          
          if (res.success && res.data) {
            const extracted = res.data;

            // -- Auto-fill Logic --
            
            // Amount
            if (extracted.total) {
              form.setValue("amount", String(extracted.total));
            }

            // Description / Merchant
            if (extracted.description) {
              form.setValue("description", extracted.description);
            }

            // Notes
            if (extracted.notes) {
              form.setValue("notes", extracted.notes);
            }

            // Category Mapping (String -> ID)
            if (extracted.category && categories) {
              // Find category ignoring case
              const matchedCat = categories.find(c => 
                c.name.toLowerCase().includes(extracted.category.toLowerCase()) || 
                extracted.category.toLowerCase().includes(c.name.toLowerCase())
              );
              if (matchedCat) {
                form.setValue("categoryId", matchedCat.id.toString());
                // Also switch tab if category type doesn't match current tab
                if (matchedCat.type !== activeTab) {
                  setActiveTab(matchedCat.type);
                  form.setValue("type", matchedCat.type);
                }
              }
            }

            // Payment Method Mapping (String -> ID)
            if (extracted.payment_method && paymentMethods) {
              const matchedPm = paymentMethods.find(pm => 
                pm.name.toLowerCase().includes(extracted.payment_method.toLowerCase()) ||
                extracted.payment_method.toLowerCase().includes(pm.name.toLowerCase())
              );
              if (matchedPm) {
                form.setValue("paymentMethodId", matchedPm.id.toString());
              }
            }

            toast({ 
              title: "Receipt Scanned!", 
              description: `Found: ${extracted.description} (${extracted.total})`,
            });
          }
        } else {
          console.error("Webhook error:", await response.text());
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

  const onSubmit = (data: any) => {
    const { receiptUrl, ...rest } = data;
    // Ensure numeric fields are actually numbers before sending to mutation
    const payload = {
      ...rest,
      amount: data.amount, // Schema handles string validation
      categoryId: data.categoryId, 
      paymentMethodId: data.paymentMethodId,
      userId: user?.id,
      type: activeTab,
      transactionDate: new Date(data.date || data.transactionDate)
    };
    console.log("Payload being sent:", payload);

    createTx.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset({
           amount: "", description: "", notes: "", receiptUrl: "", categoryId: "", paymentMethodId: "" 
        });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Receipt Upload Dropzone */}
              <div {...getRootProps()} className={`border-2 border-dashed transition-all rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer ${isScanning ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 bg-muted/20'}`}>
                <input {...getInputProps()} />
                {isUploading || isScanning ? (
                  <div className="flex flex-col items-center animate-pulse">
                    <ScanLine className="h-10 w-10 text-primary mb-2" />
                    <p className="text-sm font-medium text-primary">Scanning Receipt...</p>
                    <p className="text-xs text-muted-foreground">Extracting details via AI</p>
                  </div>
                ) : form.getValues("receiptUrl") ? (
                  <div className="relative w-full group">
                    <img src={form.getValues("receiptUrl") || ""} alt="Receipt" className="h-32 object-contain mx-auto rounded-md shadow-sm" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                      <p className="text-white text-xs font-medium">Click to replace</p>
                    </div>
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Drop receipt to scan</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports automated AI extraction</p>
                  </>
                )}
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} // <--- REMOVED Number() wrapper
                        value={field.value}            // <--- No need for .toString() if default is ""
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.filter(c => c.type === activeTab).map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}> {/* Ensure c.id is treated as string */}
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
                  name="transactionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
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

              <FormField
                control={form.control}
                name="paymentMethodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select 
                      onValueChange={field.onChange} // <--- REMOVED Number() wrapper
                      value={field.value}
                    >
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
                  disabled={createTx.isPending || isUploading || isScanning}
                >
                  {/* DEBUGGING: This will verify if there are errors blocking the submit */}
{Object.keys(form.formState.errors).length > 0 && (
  <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 rounded-md">
    <p className="font-bold">Form Errors:</p>
    <pre>{JSON.stringify(form.formState.errors, null, 2)}</pre>
  </div>
)}
                  {createTx.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                  Save Transaction
                </Button>
              </div>

            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}