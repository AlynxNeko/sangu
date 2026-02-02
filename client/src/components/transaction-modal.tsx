import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema } from "@shared/schema";
import { useTransactions, useCreateTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Upload, ScanLine } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { z } from "zod";

// Extend schema to accept strings for select fields (which we parse to numbers)
const formSchema = insertTransactionSchema.extend({
  amount: z.coerce.string(), // Handle numeric string input
  categoryId: z.coerce.number(),
  paymentMethodId: z.coerce.number(),
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
      date: new Date().toISOString().split('T')[0],
      categoryId: undefined,
      paymentMethodId: undefined,
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
        const fileName = `${user?.id}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('transaction-attachments')
          .upload(fileName, file);

        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('transaction-attachments')
          .getPublicUrl(fileName);
        
        form.setValue("receiptUrl", publicUrl);
        toast({ title: "Receipt uploaded", description: "Image attached successfully" });

        // Trigger OCR Webhook
        if (import.meta.env.VITE_N8N_OCR_WEBHOOK) {
          setIsScanning(true);
          try {
            const response = await fetch(import.meta.env.VITE_N8N_OCR_WEBHOOK, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user?.id, file_url: publicUrl })
            });
            
            if (response.ok) {
              const ocrData = await response.json();
              if (ocrData.amount) form.setValue("amount", String(ocrData.amount));
              if (ocrData.date) form.setValue("date", ocrData.date);
              if (ocrData.merchant) form.setValue("description", ocrData.merchant);
              toast({ title: "Receipt Scanned", description: "Data extracted automatically!" });
            }
          } catch (e) {
            console.error("OCR Failed", e);
          } finally {
            setIsScanning(false);
          }
        }

      } catch (e: any) {
        toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      } finally {
        setIsUploading(false);
      }
    }
  });

  const onSubmit = (data: any) => {
    createTx.mutate({
      ...data,
      userId: user?.id,
      type: activeTab
    }, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
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
              <div {...getRootProps()} className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-muted/20">
                <input {...getInputProps()} />
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : form.getValues("receiptUrl") ? (
                  <div className="relative w-full">
                    <img src={form.getValues("receiptUrl") || ""} alt="Receipt" className="h-32 object-contain mx-auto rounded-md" />
                    <div className="absolute top-0 right-0 bg-background/80 rounded-full p-1 text-xs">Tap to replace</div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Drop receipt to scan</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports automated OCR extraction</p>
                  </>
                )}
                {isScanning && <div className="mt-2 text-xs text-primary flex items-center"><ScanLine className="w-3 h-3 mr-1 animate-pulse" /> Scanning receipt...</div>}
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
                        <Input placeholder="0.00" className="pl-10 text-lg font-medium" {...field} type="number" />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
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
                  name="date"
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
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
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
                  disabled={createTx.isPending || isUploading}
                >
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
