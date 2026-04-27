import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { saveConfigToCloud, initializeExternalTables } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Database, CheckCircle2, AlertCircle } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleConnect = async () => {
    if (!url.trim() || !apiKey.trim()) {
      setFeedback({ type: "error", message: "Preencha todos os campos obrigatórios." });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const client = createClient(url.trim(), apiKey.trim());
      
      const { error: connError } = await client.from("_dummy_check").select("*").limit(1);
      if (connError && connError.code !== "PGRST205" && connError.code !== "42P01" && !connError.message.includes("does not exist")) {
        setFeedback({ type: "error", message: "Erro na conexão. Verifique suas credenciais." });
        setLoading(false);
        return;
      }

      // Save to Cloud DB
      await saveConfigToCloud(url.trim(), apiKey.trim());

      const result = await initializeExternalTables(client);
      setFeedback({ type: result.success ? "success" : "error", message: result.message });

      if (result.success) {
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Erro na conexão. Verifique suas credenciais." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">Disparador</span>{" "}
            <span className="text-foreground">Inout</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Conecte seu Supabase para iniciar.
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Integração Supabase
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Informe as credenciais do seu projeto Supabase.
              Todas as tabelas necessárias serão criadas automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="url">Supabase Project URL</Label>
              <Input
                id="url"
                placeholder="https://xxxx.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Supabase API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">O que será criado</p>
                  <p>
                    Tabelas: <code className="text-primary font-mono">disparos</code>, <code className="text-primary font-mono">contact_lists</code>, <code className="text-primary font-mono">base_contacts</code>, <code className="text-primary font-mono">message_templates</code>, <code className="text-primary font-mono">campaigns</code>, <code className="text-primary font-mono">segmentation_lists</code> e tabelas auxiliares.
                  </p>
                </div>
              </div>
            </div>

            {feedback && (
              <Alert variant={feedback.type === "error" ? "destructive" : "default"} className={feedback.type === "success" ? "border-border bg-secondary" : ""}>
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {feedback.message}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleConnect}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                "Conectar e Criar Estrutura"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
