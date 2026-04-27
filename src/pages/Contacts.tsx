import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createExternalClient, getSupabaseConfig, loadConfigFromCloud } from "@/lib/supabase-client";
import { AppHeader } from "@/components/AppHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Upload, Trash2, Users, FileSpreadsheet, UserPlus, Eye, Database } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ContactList {
  id: string;
  name: string;
  type: string;
  created_at: string;
  contact_count?: number;
}

interface Contact {
  id: string;
  nome: string | null;
  telefone: string;
  list_id: string | null;
}

export default function Contacts() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<SupabaseClient | null>(null);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [uploadContacts, setUploadContacts] = useState<{ nome: string | null; telefone: string }[]>([]);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual contact dialog
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNome, setManualNome] = useState("");
  const [manualTelefone, setManualTelefone] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  // View contacts dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewList, setViewList] = useState<ContactList | null>(null);
  const [viewContacts, setViewContacts] = useState<Contact[]>([]);
  const [loadingView, setLoadingView] = useState(false);

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
      .select("id, name, type, created_at")
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
      setLists(withCounts);
    }

    const { count } = await client
      .from("base_contacts")
      .select("*", { count: "exact", head: true });
    setTotalContacts(count || 0);
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const startIdx = rows.length > 0 && typeof rows[0][0] === "string" &&
          (rows[0][0].toLowerCase().includes("nome") || rows[0][0].toLowerCase().includes("name")) ? 1 : 0;

        const parsed: { nome: string | null; telefone: string }[] = [];
        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[1]) continue;
          parsed.push({
            nome: row[0] ? String(row[0]).trim() : null,
            telefone: String(row[1]).trim(),
          });
        }

        if (parsed.length === 0) {
          toast.error("Nenhum contato encontrado na planilha.");
        } else {
          setUploadContacts(parsed);
          setFileName(file.name);
          if (!listName) setListName(file.name.replace(/\.(xlsx|xls|csv)$/i, ""));
          toast.success(`${parsed.length} contatos encontrados.`);
        }
      } catch {
        toast.error("Erro ao ler a planilha.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleUploadSave = async () => {
    if (!client) return;
    if (!listName.trim()) { toast.error("Dê um nome para a planilha."); return; }
    if (uploadContacts.length === 0) { toast.error("Selecione uma planilha."); return; }

    setSaving(true);

    const { data: list, error } = await client
      .from("contact_lists")
      .insert({ name: listName.trim(), type: "spreadsheet" })
      .select("id")
      .single();

    if (error || !list) { toast.error("Erro ao salvar."); setSaving(false); return; }

    const batchSize = 500;
    for (let i = 0; i < uploadContacts.length; i += batchSize) {
      const batch = uploadContacts.slice(i, i + batchSize).map((c) => ({
        list_id: list.id,
        nome: c.nome,
        telefone: c.telefone,
      }));
      await client.from("base_contacts").insert(batch);
    }

    toast.success(`"${listName}" salva com ${uploadContacts.length} contatos!`);
    setListName("");
    setUploadContacts([]);
    setFileName("");
    setUploadOpen(false);
    fetchData();
    setSaving(false);
  };

  const handleManualSave = async () => {
    if (!client) return;
    if (!manualTelefone.trim()) { toast.error("Informe o telefone."); return; }

    setSavingManual(true);

    // Find or create a "Contatos Avulsos" list
    let { data: manualList } = await client
      .from("contact_lists")
      .select("id")
      .eq("type", "manual")
      .maybeSingle();

    if (!manualList) {
      const { data: newList } = await client
        .from("contact_lists")
        .insert({ name: "Contatos Avulsos", type: "manual" })
        .select("id")
        .single();
      manualList = newList;
    }

    if (!manualList) { toast.error("Erro ao criar lista."); setSavingManual(false); return; }

    const { error } = await client.from("base_contacts").insert({
      list_id: manualList.id,
      nome: manualNome.trim() || null,
      telefone: manualTelefone.trim(),
    });

    if (error) {
      toast.error("Erro ao salvar contato.");
    } else {
      toast.success("Contato adicionado!");
      setManualNome("");
      setManualTelefone("");
      setManualOpen(false);
      fetchData();
    }
    setSavingManual(false);
  };

  const handleViewList = async (list: ContactList) => {
    if (!client) return;
    setViewList(list);
    setViewOpen(true);
    setLoadingView(true);
    const { data } = await client
      .from("base_contacts")
      .select("id, nome, telefone, list_id")
      .eq("list_id", list.id)
      .order("created_at", { ascending: false });
    setViewContacts(data || []);
    setLoadingView(false);
  };

  const handleDeleteList = async (id: string) => {
    if (!client) return;
    const { error } = await client.from("contact_lists").delete().eq("id", id);
    if (!error) {
      setLists((prev) => prev.filter((l) => l.id !== id));
      toast.success("Planilha excluída.");
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Base de Contatos</h2>
            <p className="text-sm text-muted-foreground">Gerencie suas planilhas e contatos avulsos.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Contato Manual
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Adicionar Contato</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Nome (opcional)</Label>
                    <Input
                      placeholder="Nome do contato"
                      value={manualNome}
                      onChange={(e) => setManualNome(e.target.value)}
                      className="bg-secondary border-border"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone *</Label>
                    <Input
                      placeholder="+55 11 99999-9999"
                      value={manualTelefone}
                      onChange={(e) => setManualTelefone(e.target.value)}
                      className="bg-secondary border-border"
                      maxLength={20}
                    />
                  </div>
                  <Button onClick={handleManualSave} disabled={savingManual} className="w-full">
                    {savingManual ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar Contato"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  Importar Planilha
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Subir Planilha de Contatos</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Nome da Planilha</Label>
                    <Input
                      placeholder="Ex: Clientes VIP, Base Janeiro..."
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      className="bg-secondary border-border"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      A 1ª coluna deve ser o <strong>Nome</strong> e a 2ª o <strong>Número de telefone</strong>.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Selecionar arquivo (.xlsx, .xls, .csv)
                    </Button>
                    {fileName && <p className="text-xs text-muted-foreground">📄 {fileName}</p>}
                  </div>
                  {uploadContacts.length > 0 && (
                    <>
                      <p className="text-sm text-primary font-medium">✓ {uploadContacts.length} contatos encontrados</p>
                      <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border">
                              <TableHead className="text-muted-foreground text-xs">Nome</TableHead>
                              <TableHead className="text-muted-foreground text-xs">Telefone</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {uploadContacts.slice(0, 10).map((c, i) => (
                              <TableRow key={i} className="border-border">
                                <TableCell className="text-sm py-1.5">{c.nome || "—"}</TableCell>
                                <TableCell className="text-sm font-mono py-1.5">{c.telefone}</TableCell>
                              </TableRow>
                            ))}
                            {uploadContacts.length > 10 && (
                              <TableRow><TableCell colSpan={2} className="text-xs text-muted-foreground text-center py-2">... e mais {uploadContacts.length - 10}</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                  <Button onClick={handleUploadSave} disabled={saving} className="w-full">
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar Planilha"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground text-xs"
                    onClick={() => {
                      const modelData = [
                        ["NOME", "NÚMERO"],
                        ["Maria Silva", "5511999990001"],
                        ["João Santos", "5521988880002"],
                        ["Ana Oliveira", "5531977770003"],
                        ["Carlos Souza", "5541966660004"],
                        ["Fernanda Lima", "5551955550005"],
                        ["Pedro Costa", "5561944440006"],
                        ["Juliana Almeida", "5571933330007"],
                        ["Rafael Pereira", "5581922220008"],
                        ["Beatriz Rocha", "5591911110009"],
                        ["Lucas Ferreira", "5511900000010"],
                      ];
                      const ws = XLSX.utils.aoa_to_sheet(modelData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Modelo");
                      XLSX.writeFile(wb, "modelo_contatos.xlsx");
                    }}
                  >
                    Baixar Modelo
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <StatCard label="Total de Contatos" value={totalContacts} icon={Database} />
          <StatCard label="Planilhas" value={lists.filter(l => l.type === "spreadsheet").length} icon={FileSpreadsheet} />
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Planilhas e Listas
            </CardTitle>
            <CardDescription>Todas as suas planilhas e grupos de contatos.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : lists.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma planilha ou contato cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {lists.map((l) => (
                  <div key={l.id} className="rounded-lg border border-border bg-secondary/50 p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-sm text-foreground flex items-center gap-2">
                        {l.type === "manual" ? <UserPlus className="h-4 w-4 text-primary" /> : <FileSpreadsheet className="h-4 w-4 text-primary" />}
                        {l.name}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {l.contact_count} contatos • {new Date(l.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleViewList(l)} className="h-8 gap-1.5 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteList(l.id)} className="h-8 text-xs text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View contacts dialog */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="bg-card border-border sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Contatos — {viewList?.name}</DialogTitle>
            </DialogHeader>
            {loadingView ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground text-xs">Nome</TableHead>
                      <TableHead className="text-muted-foreground text-xs">Telefone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewContacts.map((c) => (
                      <TableRow key={c.id} className="border-border">
                        <TableCell className="text-sm py-1.5">{c.nome || "—"}</TableCell>
                        <TableCell className="text-sm font-mono py-1.5">{c.telefone}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
