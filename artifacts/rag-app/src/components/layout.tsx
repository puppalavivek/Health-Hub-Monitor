import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Files, 
  MessageSquare, 
  Network, 
  MessageCircle,
  Menu,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { data: health, isLoading: isHealthLoading } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() }});

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/documents", label: "Library", icon: Files },
    { href: "/ask", label: "Query", icon: MessageSquare },
    { href: "/chat", label: "Assistant", icon: MessageCircle },
    { href: "/architecture", label: "System Design", icon: Network },
  ];

  const NavLinks = () => (
    <div className="flex flex-col gap-2 p-4">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = location === link.href;
        return (
          <Link key={link.href} href={link.href}>
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
              isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`} onClick={() => setIsMobileOpen(false)}>
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2 font-bold text-lg text-primary">
          <Network className="h-6 w-6" />
          DocMind
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
            <div className="p-6 border-b border-sidebar-border flex items-center gap-2 font-bold text-xl text-primary">
              <Network className="h-6 w-6" />
              DocMind
            </div>
            <NavLinks />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0">
        <div className="p-6 border-b border-sidebar-border flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
          <Network className="h-6 w-6" />
          DocMind
        </div>
        <div className="flex-1 overflow-auto">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 p-2 rounded-md border">
            <div className={`w-2 h-2 rounded-full ${isHealthLoading ? "bg-yellow-500 animate-pulse" : health?.status === "ok" ? "bg-green-500" : "bg-destructive"}`}></div>
            <span className="font-mono text-xs">System: {isHealthLoading ? "Checking..." : health?.status === "ok" ? "Operational" : "Degraded"}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
