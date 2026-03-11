import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseConfig, loadConfigFromCloud } from "@/lib/supabase-client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, FileText, Edit } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const init = async () => {
      let config = getSupabaseConfig();
      if (!config) config = await loadConfigFromCloud();
      if (!config) { navigate("/onboarding"); return; }
      fetchTemplates();
    };
    init();
  }, [navigate]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("message_templates")
      .select("id, title, content, created_at")
      .order("created_at", { ascending: false });
    if (data) setTemplates(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) { toast.error("Preencha título e conteúdo."); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("message_templates").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
    });

    if (error) {
      toast.error("Erro ao salvar template.");
    } else {
      toast.success("Template criado!");
      setTitle("");
      setContent("");
      setCreateOpen(false);
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleOpenEdit = (t: Template) => {
    setEditTemplate(t);
    setEditTitle(t.title);
    setEditContent(t.content);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTemplate || !editTitle.trim() || !editContent.trim()) { toast.error("Preencha título e conteúdo."); return; }

    setSavingEdit(true);
    const { error } = await supabase
      .from("message_templates")
      .update({ title: editTitle.trim(), content: editContent.trim() })
      .eq("id", editTemplate.id);

    if (error) {
      toast.error("Erro ao atualizar.");
    } else {
      toast.success("Template atualizado!");
      setEditOpen(false);
      fetchTemplates();
    }
    setSavingEdit(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("message_templates").delete().eq("id", id);
    if (!error) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template excluído.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Templates de Mensagem</h2>
            <p className="text-sm text-muted-foreground">Crie e gerencie seus templates de mensagem ilimitados.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Boas-vindas, Promoção..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-secondary border-border"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    placeholder="Digite o conteúdo do template..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="bg-secondary border-border min-h-[150px]"
                    maxLength={2000}
                  />
                </div>
                <Button onClick={handleCreate} disabled={saving} className="w-full">
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Seus Templates
            </CardTitle>
            <CardDescription>{templates.length} template(s) criado(s).</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum template criado ainda. Crie seu primeiro template!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-border bg-secondary/50 p-4 space-y-3 flex flex-col"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm text-foreground">{t.title}</h3>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(t)} className="h-7 w-7 p-0">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4 flex-1">
                      {t.content}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(t.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="bg-card border-border sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-secondary border-border"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="bg-secondary border-border min-h-[150px]"
                  maxLength={2000}
                />
              </div>
              <Button onClick={handleSaveEdit} disabled={savingEdit} className="w-full">
                {savingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar Alterações"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
