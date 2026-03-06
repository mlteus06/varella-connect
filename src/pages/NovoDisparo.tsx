import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createExternalClient, getSupabaseConfig, getLastMessage, saveLastMessage, loadConfigFromCloud } from "@/lib/supabase-client";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { CampaignManager } from "@/components/CampaignManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertCircle, Plus, Copy, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  title: string;
  content: string;
}

export default function NovoDisparo() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("Olá");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      let config = getSupabaseConfig();
      if (!config) {
        config = await loadConfigFromCloud();
      }
      if (!config) {
        navigate("/onboarding");
        return;
      }
      const lastMsg = await getLastMessage();
      setMensagem(lastMsg);
      setLoadingMessage(false);
      fetchTemplates();
    };
    init();
  }, [navigate]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    const { data } = await supabase
      .from("message_templates")
      .select("id, title, content")
      .order("created_at", { ascending: false });
    if (data) setTemplates(data);
    setLoadingTemplates(false);
  };

  const handleSaveTemplate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Preencha o título e o conteúdo do template.");
      return;
    }
    setSavingTemplate(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("message_templates").insert({
      user_id: user.id,
      title: newTitle.trim(),
      content: newContent.trim(),
    });

    if (error) {
      toast.error("Erro ao salvar template.");
    } else {
      toast.success("Template salvo!");
      setNewTitle("");
      setNewContent("");
      setDialogOpen(false);
      fetchTemplates();
    }
    setSavingTemplate(false);
  };

  const handleUseTemplate = (content: string) => {
    setMensagem(content);
    saveLastMessage(content);
    toast.success("Mensagem aplicada!");
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await supabase.from("message_templates").delete().eq("id", id);
    if (!error) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template excluído.");
    }
  };

  const handleMensagemChange = (value: string) => {
    setMensagem(value);
  };

  const handleMensagemBlur = () => {
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
      await saveLastMessage(mensagem);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl py-8 animate-fade-in space-y-6">
        {/* Formulário de cadastro */}
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
                  <AlertDescription>{feedback.message}</AlertDescription>
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

        {/* Templates de Mensagem */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Templates de Mensagem
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                Salve mensagens prontas para reutilizar nos seus disparos.
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Template
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Criar Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="tpl-title">Título</Label>
                    <Input
                      id="tpl-title"
                      placeholder="Ex: Boas-vindas, Promoção..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="bg-secondary border-border"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tpl-content">Mensagem</Label>
                    <Textarea
                      id="tpl-content"
                      placeholder="Digite o conteúdo do template..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="bg-secondary border-border min-h-[120px]"
                      maxLength={1000}
                    />
                  </div>
                  <Button onClick={handleSaveTemplate} disabled={savingTemplate} className="w-full">
                    {savingTemplate ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Template"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum template criado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-foreground">{tpl.title}</p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUseTemplate(tpl.content)}
                          className="h-8 gap-1.5 text-xs text-primary hover:text-primary"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Usar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {tpl.content}
                    </p>
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
