import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createExternalClient, getSupabaseConfig, loadConfigFromCloud } from "@/lib/supabase-client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Layers, Eye, FileSpreadsheet, UserPlus, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ContactList {
  id: string;
  name: string;
  type: string;
  contact_count?: number;
}

interface SegmentationList {
  id: string;
  name: string;
  created_at: string;
  sources: { id: string; name: string; type: string }[];
  total_contacts?: number;
}

export default function Segmentation() {
  const navigate = useNavigate();
  const [segments, setSegments] = useState<SegmentationList[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<SupabaseClient | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [segName, setSegName] = useState("");
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewSegment, setViewSegment] = useState<SegmentationList | null>(null);

  useEffect(() => {
    const init = async () => {
      let config = getSupabaseConfig();
      if (!config) config = await loadConfigFromCloud();
      if (!config) { navigate("/onboarding"); return; }
      const ext = createExternalClient();
      if (!ext) { navigate("/onboarding"); return; }
      setClient(ext);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (client) fetchData();
  }, [client]);

  const fetchData = async () => {
    if (!client) return;
    setLoading(true);

    const { data: listsData } = await client
      .from("contact_lists")
      .select("id, name, type")
      .order("created_at", { ascending: false });

    if (listsData) {
      const withCounts = await Promise.all(
        listsData.map(async (l: any) => {
          const { count } = await client
            .from("base_contacts")
            .select("*", { count: "exact", head: true })
            .eq("list_id", l.id);
          return { ...l, contact_count: count || 0 };
        })
      );
      setContactLists(withCounts);
    }

    const { data: segsData } = await client
      .from("segmentation_lists")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });

    if (segsData) {
      const segsWithSources = await Promise.all(
        segsData.map(async (s: any) => {
          const { data: sources } = await client
            .from("segmentation_sources")
            .select("contact_list_id")
            .eq("segmentation_id", s.id);

          const sourceDetails: { id: string; name: string; type: string }[] = [];
          let totalContacts = 0;

          if (sources) {
            for (const src of sources) {
              const list = listsData?.find((l: any) => l.id === src.contact_list_id);
              if (list) {
                sourceDetails.push({ id: list.id, name: list.name, type: list.type });
                const { count } = await client
                  .from("base_contacts")
                  .select("*", { count: "exact", head: true })
                  .eq("list_id", list.id);
                totalContacts += count || 0;
              }
            }
          }

          return { ...s, sources: sourceDetails, total_contacts: totalContacts };
        })
      );
      setSegments(segsWithSources);
    }

    setLoading(false);
  };

  const toggleList = (id: string) => {
    setSelectedListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!client) return;
    if (!segName.trim()) { toast.error("Dê um nome para a segmentação."); return; }
    if (selectedListIds.length === 0) { toast.error("Selecione pelo menos uma lista."); return; }

    setSaving(true);

    const { data: seg, error } = await client
      .from("segmentation_lists")
      .insert({ name: segName.trim() })
      .select("id")
      .single();

    if (error || !seg) { toast.error("Erro ao criar segmentação."); setSaving(false); return; }

    const sources = selectedListIds.map((listId) => ({
      segmentation_id: seg.id,
      contact_list_id: listId,
    }));

    await client.from("segmentation_sources").insert(sources);

    toast.success(`Segmentação "${segName}" criada!`);
    setSegName("");
    setSelectedListIds([]);
    setCreateOpen(false);
    fetchData();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!client) return;
    const { error } = await client.from("segmentation_lists").delete().eq("id", id);
    if (!error) {
      setSegments((prev) => prev.filter((s) => s.id !== id));
      toast.success("Segmentação excluída.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Segmentação</h2>
            <p className="text-sm text-muted-foreground">Crie listas de segmentação combinando planilhas e contatos da sua base.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Segmentação
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Segmentação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nome da Segmentação</Label>
                  <Input
                    placeholder="Ex: Leads Quentes, Clientes SP..."
                    value={segName}
                    onChange={(e) => setSegName(e.target.value)}
                    className="bg-secondary border-border"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Selecione as listas de contatos</Label>
                  {contactLists.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma lista encontrada. Suba uma planilha primeiro na Base de Contatos.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto rounded-lg border border-border p-3">
                      {contactLists.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center gap-3 rounded-md p-2 hover:bg-secondary/50 cursor-pointer"
                          onClick={() => toggleList(l.id)}
                        >
                          <Checkbox
                            checked={selectedListIds.includes(l.id)}
                            onCheckedChange={() => toggleList(l.id)}
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {l.type === "manual" ? <UserPlus className="h-4 w-4 text-primary shrink-0" /> : <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />}
                            <span className="text-sm truncate">{l.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{l.contact_count} contatos</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedListIds.length > 0 && (
                    <p className="text-sm text-primary font-medium">
                      ✓ {selectedListIds.length} lista(s) selecionada(s)
                    </p>
                  )}
                </div>
                <Button onClick={handleCreate} disabled={saving} className="w-full">
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Criar Segmentação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Listas de Segmentação
            </CardTitle>
            <CardDescription>Suas listas de segmentação para uso em campanhas.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : segments.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma segmentação criada ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {segments.map((s) => (
                  <div key={s.id} className="rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-sm text-foreground flex items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" />
                          {s.name}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.total_contacts} contatos • {s.sources.length} lista(s) • {new Date(s.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setViewSegment(s); setViewOpen(true); }}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(s.id)}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.sources.map((src) => (
                        <span key={src.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                          {src.type === "manual" ? <UserPlus className="h-3 w-3" /> : <FileSpreadsheet className="h-3 w-3" />}
                          {src.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Segmentação — {viewSegment?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Total: <strong className="text-foreground">{viewSegment?.total_contacts}</strong> contatos
              </p>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Listas incluídas:</Label>
                {viewSegment?.sources.map((src) => (
                  <div key={src.id} className="flex items-center gap-2 rounded-md border border-border p-2.5">
                    {src.type === "manual" ? <UserPlus className="h-4 w-4 text-primary" /> : <FileSpreadsheet className="h-4 w-4 text-primary" />}
                    <span className="text-sm">{src.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
