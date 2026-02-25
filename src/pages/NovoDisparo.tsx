import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createExternalClient, getSupabaseConfig, getLastMessage, saveLastMessage, loadConfigFromCloud } from "@/lib/supabase-client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function NovoDisparo() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("Olá");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      let config = getSupabaseConfig();
      if (!config) {
        config = await loadConfigFromCloud();
      }
      if (!config) {
        navigate("/");
        return;
      }
      // Load last message from Cloud
      const lastMsg = await getLastMessage();
      setMensagem(lastMsg);
      setLoadingMessage(false);
    };
    init();
  }, [navigate]);

  const handleMensagemChange = (value: string) => {
    setMensagem(value);
  };

  const handleMensagemBlur = () => {
    // Save last message when user leaves the field
    saveLastMessage(mensagem);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!telefone.trim()) {
      setFeedback({ type: "error", message: "O campo telefone é obrigatório." });
      return;
    }

    const client = createExternalClient();
    if (!client) {
      setFeedback({ type: "error", message: "Conexão com Supabase não encontrada." });
      return;
    }

    setLoading(true);

    const { error } = await client.from("disparos").insert({
      nome: nome.trim() || null,
      telefone: telefone.trim(),
      mensagem: mensagem.trim() || "Olá",
      status: "PENDENTE",
    });

    if (error) {
      setFeedback({ type: "error", message: `Erro ao salvar: ${error.message}` });
    } else {
      setFeedback({ type: "success", message: "Registro salvo com status PENDENTE." });
      setNome("");
      setTelefone("");
      // Save the message as last used
      await saveLastMessage(mensagem);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-lg py-8 animate-fade-in">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Novo Cadastro de Disparo</CardTitle>
            <CardDescription className="text-muted-foreground">
              Registre um novo contato para disparo. O status será definido como PENDENTE.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome <span className="text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="nome"
                  placeholder="Nome do contato"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="bg-secondary border-border"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone <span className="text-primary">*</span></Label>
                <Input
                  id="telefone"
                  placeholder="+55 11 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="bg-secondary border-border"
                  maxLength={20}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mensagem">Mensagem</Label>
                {loadingMessage ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : (
                  <Textarea
                    id="mensagem"
                    placeholder="Digite a mensagem..."
                    value={mensagem}
                    onChange={(e) => handleMensagemChange(e.target.value)}
                    onBlur={handleMensagemBlur}
                    className="bg-secondary border-border min-h-[100px]"
                    maxLength={1000}
                  />
                )}
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

              <Button type="submit" disabled={loading || loadingMessage} className="w-full" size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar no Supabase"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
