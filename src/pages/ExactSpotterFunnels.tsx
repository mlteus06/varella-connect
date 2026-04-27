import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Network, ChevronRight } from "lucide-react";
import { getSupabaseConfig, getExactTokenFromCloud } from "@/lib/supabase-client";
import { ExactFunnel, fetchExactFunnels } from "@/lib/exact-spotter";
import { toast } from "sonner";

export default function ExactSpotterFunnels() {
  const navigate = useNavigate();
  const [funnels, setFunnels] = useState<ExactFunnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!getSupabaseConfig()) {
        navigate("/onboarding");
        return;
      }

      const tokenExact = await getExactTokenFromCloud();
      if (!tokenExact) {
        toast.error("Salve o token do Exact Spotter antes de importar.");
        navigate("/integracoes");
        return;
      }

      try {
        const data = await fetchExactFunnels(tokenExact);
        setFunnels(data);
      } catch (error: any) {
        toast.error(error?.message || "Não foi possível carregar os funis do Exact Spotter.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/segmentacao")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Funis do Exact Spotter</h2>
              <p className="text-sm text-muted-foreground">
                Escolha o funil da conta para continuar a criação da segmentação.
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Network className="h-5 w-5 text-primary" />
              Funis disponíveis
            </CardTitle>
            <CardDescription>Ao selecionar um funil, você seguirá para a lista de etapas.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : funnels.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum funil ativo foi encontrado nessa conta.
              </div>
            ) : (
              <div className="space-y-3">
                {funnels.map((funnel) => (
                  <button
                    key={funnel.id}
                    onClick={() =>
                      navigate(`/segmentacao/exact-spotter/${funnel.id}/etapas`, {
                        state: { funnelName: funnel.value },
                      })
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/50 p-4 text-left transition-colors hover:bg-secondary"
                  >
                    <div>
                      <div className="font-medium text-sm text-foreground">{funnel.value}</div>
                      <p className="text-xs text-muted-foreground">ID do funil: {funnel.id}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
