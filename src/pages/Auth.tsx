import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { saveConfigToCloud, loadConfigFromCloud } from "@/lib/supabase-client";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseApiKey, setSupabaseApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const validateExternalConnection = async (url: string, key: string) => {
    try {
      const client = createClient(url, key);
      const { error } = await client.from("_dummy_check").select("*").limit(1);
      if (error && error.code !== "PGRST205" && error.code !== "42P01" && !error.message.includes("does not exist")) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setFeedback({ type: "error", message: error.message });
          setLoading(false);
          return;
        }
        // Fetch config from Cloud
        const config = await loadConfigFromCloud();
        if (config) {
          navigate("/dashboard");
        } else {
          // No config yet — go to onboarding to set up Supabase credentials
          navigate("/onboarding");
        }
      } else {
        // Signup flow
        if (!supabaseUrl.trim() || !supabaseApiKey.trim()) {
          setFeedback({ type: "error", message: "Preencha a URL e API Key do seu Supabase." });
          setLoading(false);
          return;
        }

        const valid = await validateExternalConnection(supabaseUrl.trim(), supabaseApiKey.trim());
        if (!valid) {
          setFeedback({ type: "error", message: "Não foi possível conectar ao Supabase. Verifique as credenciais." });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setFeedback({ type: "error", message: error.message });
          setLoading(false);
          return;
        }

        if (data.session) {
          // Auto-confirmed — save config and go to dashboard
          await saveConfigToCloud(supabaseUrl.trim(), supabaseApiKey.trim());
          navigate("/dashboard");
        } else {
          setFeedback({
            type: "success",
            message: "Cadastro realizado! Faça login para continuar.",
          });
          setIsLogin(true);
        }
      }
    } catch {
      setFeedback({ type: "error", message: "Erro inesperado. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">Disparador</span>{" "}
            <span className="text-foreground">Varella</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin ? "Entre na sua conta" : "Crie sua conta"}
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              {isLogin ? "Login" : "Cadastro"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isLogin
                ? "Informe suas credenciais para acessar o painel."
                : "Preencha os dados para criar sua conta e conectar seu Supabase."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-border"
                  required
                  minLength={6}
                />
              </div>

              {!isLogin && (
                <>
                  <div className="my-4 border-t border-border" />
                  <p className="text-xs text-muted-foreground font-medium">Conexão com seu Supabase externo</p>
                  <div className="space-y-2">
                    <Label htmlFor="supabaseUrl">Supabase Project URL</Label>
                    <Input
                      id="supabaseUrl"
                      placeholder="https://xxxx.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="bg-secondary border-border"
                      required={!isLogin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supabaseApiKey">Supabase API Key</Label>
                    <Input
                      id="supabaseApiKey"
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      value={supabaseApiKey}
                      onChange={(e) => setSupabaseApiKey(e.target.value)}
                      className="bg-secondary border-border"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}

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

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? "Entrando..." : "Cadastrando..."}
                  </>
                ) : isLogin ? (
                  "Entrar"
                ) : (
                  "Criar Conta"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFeedback(null);
                }}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? "Criar conta" : "Fazer login"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
