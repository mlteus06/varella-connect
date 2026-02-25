import { useNavigate, useLocation } from "react-router-dom";
import { clearSupabaseConfig } from "@/lib/supabase-client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Plus } from "lucide-react";

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    clearSupabaseConfig();
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-primary">Disparador</span>{" "}
            <span className="text-foreground">Varella</span>
          </h1>
          <nav className="flex items-center gap-1">
            <Button
              variant={location.pathname === "/dashboard" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2 text-sm"
            >
              <LayoutDashboard className="h-4 w-4" />
              Painel
            </Button>
            <Button
              variant={location.pathname === "/novo" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => navigate("/novo")}
              className="gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Novo Cadastro
            </Button>
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
