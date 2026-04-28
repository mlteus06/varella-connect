import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Network, ChevronRight, ArchiveX } from "lucide-react";
import { getSupabaseConfig, getExactTokenFromCloud } from "@/lib/supabase-client";
import { ExactFunnel, fetchExactFunnels } from "@/lib/exact-spotter";
import { toast } from "sonner";

export default function ExactSpotterFunnels() {
  const navigate = useNavigate();
  const [funnels, setFunnels] = useState<ExactFunnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        setPageError(null);

        if (!getSupabaseConfig()) {
          toast.error("Configure o Supabase antes de usar essa integracao.");
          navigate("/onboarding");
          return;
        }

        const tokenExact = await getExactTokenFromCloud();
        if (!tokenExact) {
          toast.error("Salve o token do Exact Spotter antes de importar.");
          navigate("/integracoes");
          return;
        }

        const data = await fetchExactFunnels(tokenExact);
        if (active) {
          setFunnels(data);
        }
      } catch (error: any) {
        const message = error?.message || "Nao foi possivel carregar os funis do Exact Spotter.";
        if (active) {
          setPageError(message);
          toast.error(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      active = false;
    };
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
                Escolha o funil da conta para continuar a criacao da segmentacao.
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Network className="h-5 w-5 text-primary" />
              Funis disponiveis
            </CardTitle>
            <CardDescription>Ao selecionar um funil, voce seguira para a lista de etapas.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pageError ? (
              <div className="space-y-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">{pageError}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Tentar novamente
                </Button>
              </div>
            ) : funnels.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum funil ativo foi encontrado nessa conta.
              </div>
            ) : (
              <div className="space-y-3">
                {funnels.map((funnel) => (
                  <div
                    key={funnel.id}
                    className="rounded-lg border border-border bg-secondary/50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium text-sm text-foreground">{funnel.value}</div>
                        <p className="text-xs text-muted-foreground">ID do funil: {funnel.id}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() =>
                            navigate(`/segmentacao/exact-spotter/${funnel.id}/etapas`, {
                              state: { funnelName: funnel.value, focusDiscarded: true },
                            })
                          }
                        >
                          <ArchiveX className="h-4 w-4" />
                          Leads descartados
                        </Button>
                        <Button
                          className="gap-2"
                          onClick={() =>
                            navigate(`/segmentacao/exact-spotter/${funnel.id}/etapas`, {
                              state: { funnelName: funnel.value },
                            })
                          }
                        >
                          Ver etapas
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
