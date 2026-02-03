import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  WalletCards, 
  PieChart, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Plus,
  HandCoins
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { cn } from "@/lib/utils";
import { TransactionModal } from "./transaction-modal";
import { Repeat } from "lucide-react";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transactions", label: "Transactions", icon: WalletCards },
    { href: "/recurring", label: "Recurring", icon: Repeat },
    { href: "/debts", label: "Debts & Credits", icon: HandCoins },
    { href: "/analytics", label: "Analytics", icon: PieChart },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-border/50 bg-card/30 backdrop-blur-xl p-6 fixed h-full z-30">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-xl font-bold text-black">S</span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Sangu</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium cursor-pointer group",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive(item.href) ? "text-primary" : "group-hover:text-primary transition-colors")} />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <Button 
            onClick={() => setIsTxModalOpen(true)}
            className="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/25 rounded-xl h-12 font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> New Transaction
          </Button>

          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => signOut()}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-white/5 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="font-bold text-black text-sm">S</span>
          </div>
          <span className="font-bold font-display text-lg">Sangu</span>
        </div>
        
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-r border-white/10 p-6">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="text-xl font-bold text-black">S</span>
                </div>
                <h1 className="text-2xl font-bold font-display">Sangu</h1>
              </div>

              <nav className="space-y-2 flex-1">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer",
                        isActive(item.href)
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                  </Link>
                ))}
              </nav>
              
              <Button 
                onClick={() => {
                  setIsMobileOpen(false);
                  setIsTxModalOpen(true);
                }}
                className="w-full mb-4 bg-primary text-primary-foreground font-bold"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Transaction
              </Button>

              <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
                <LogOut className="w-5 h-5 mr-3" /> Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 pt-20 lg:pt-8 p-4 lg:p-8 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
        {children}
      </main>

      {/* Global Transaction Modal */}
      <TransactionModal open={isTxModalOpen} onOpenChange={setIsTxModalOpen} />
    </div>
  );
}
