import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSupabaseConfig, loadUserCloudConfig, saveExactTokenToCloud } from "@/lib/supabase-client";
import { Loader2, KeyRound, Link2, CheckCircle2, AlertCircle } from "lucide-react";

export default function Integrations() {
  const navigate = useNavigate();
  const [tokenExact, setTokenExact] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      const localConfig = getSupabaseConfig();
      if (!localConfig) {
        navigate("/onboarding");
        return;
      }

      const cloudConfig = await loadUserCloudConfig();
      if (!cloudConfig) {
        navigate("/onboarding");
        return;
      }

      setTokenExact(cloudConfig.tokenExact ?? "");
      setLoading(false);
    };

    init();
  }, [navigate]);

  const handleSave = async () => {
    if (!tokenExact.trim()) {
      setFeedback({ type: "error", message: "Informe o token do Exact Spotter." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await saveExactTokenToCloud(tokenExact);
      setFeedback({ type: "success", message: "Token do Exact Spotter salvo com sucesso." });
    } catch (error: any) {
      setFeedback({ type: "error", message: error?.message || "Não foi possível salvar o token." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 animate-fade-in">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Integrações</h2>
          <p className="text-sm text-muted-foreground">
            Conecte o Disparador ao Exact Spotter para criar segmentações a partir dos seus funis.
          </p>
        </div>

        <Card className="max-w-2xl bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5 text-primary" />
              Exact Spotter
            </CardTitle>
            <CardDescription>
              Salve o seu `token_exact` para habilitar a importação de contatos por funil e etapa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tokenExact">Token Exact</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="tokenExact"
                      type="password"
                      placeholder="a28d5530-f2be-4e6d-a7f2-6a667cfd5abd"
                      value={tokenExact}
                      onChange={(event) => setTokenExact(event.target.value)}
                      className="bg-secondary border-border pl-9"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/50 p-4 text-xs text-muted-foreground">
                  O token fica salvo em `user_configs.token_exact` e será usado apenas para listar funis, etapas e contatos do
                  Exact Spotter durante a criação da segmentação.
                </div>

                {feedback && (
                  <Alert
                    variant={feedback.type === "error" ? "destructive" : "default"}
                    className={feedback.type === "success" ? "border-border bg-secondary" : ""}
                  >
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{feedback.message}</AlertDescription>
                  </Alert>
                )}

                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar integração"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
