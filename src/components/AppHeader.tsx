import { useNavigate, useLocation } from "react-router-dom";
import { clearSupabaseConfig } from "@/lib/supabase-client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Users, Layers, FileText, Megaphone, PlugZap } from "lucide-react";

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    clearSupabaseConfig();
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const navItems = [
    { path: "/dashboard", label: "Painel", icon: LayoutDashboard },
    { path: "/contatos", label: "Contatos", icon: Users },
    { path: "/segmentacao", label: "Segmentação", icon: Layers },
    { path: "/templates", label: "Templates", icon: FileText },
    { path: "/campanhas", label: "Campanhas", icon: Megaphone },
    { path: "/integracoes", label: "Integrações", icon: PlugZap },
  ];

  return (
    <header className="border-b border-border bg-card">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-primary">Disparador</span>{" "}
            <span className="text-foreground">Inout</span>
          </h1>
          <nav className="flex items-center gap-0.5">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Button
                key={path}
                variant={location.pathname === path ? "secondary" : "ghost"}
                size="sm"
                onClick={() => navigate(path)}
                className="gap-1.5 text-xs"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </nav>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
