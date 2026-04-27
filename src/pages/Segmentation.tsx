<<<<<<< HEAD
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { AppHeader } from "@/components/AppHeader";
import { createExternalClient, getSupabaseConfig, loadConfigFromCloud } from "@/lib/supabase-client";
=======
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createExternalClient, getSupabaseConfig, loadConfigFromCloud } from "@/lib/supabase-client";
import { AppHeader } from "@/components/AppHeader";
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
<<<<<<< HEAD
import { Loader2, Plus, Trash2, Layers, Eye, FileSpreadsheet, UserPlus, Pencil, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";
=======
import { Loader2, Plus, Trash2, Layers, Eye, FileSpreadsheet, UserPlus, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47

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

<<<<<<< HEAD
=======
  // Edit dialog
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
  const [editOpen, setEditOpen] = useState(false);
  const [editSegment, setEditSegment] = useState<SegmentationList | null>(null);
  const [editUploadContacts, setEditUploadContacts] = useState<{ nome: string | null; telefone: string }[]>([]);
  const [editFileName, setEditFileName] = useState("");
  const [editListName, setEditListName] = useState("");
  const [editManualNome, setEditManualNome] = useState("");
  const [editManualTelefone, setEditManualTelefone] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
<<<<<<< HEAD
=======
  
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47

  useEffect(() => {
    const init = async () => {
      let config = getSupabaseConfig();
      if (!config) config = await loadConfigFromCloud();
<<<<<<< HEAD
      if (!config) {
        navigate("/onboarding");
        return;
      }

      const ext = createExternalClient();
      if (!ext) {
        navigate("/onboarding");
        return;
      }

      setClient(ext);
    };

=======
      if (!config) { navigate("/onboarding"); return; }
      const ext = createExternalClient();
      if (!ext) { navigate("/onboarding"); return; }
      setClient(ext);
    };
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
    init();
  }, [navigate]);

  useEffect(() => {
    if (client) fetchData();
  }, [client]);

  const syncHotLeads = async () => {
    if (!client) return;

<<<<<<< HEAD
=======
    // Fetch all contacts that responded
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
    const { data: hotDisparos } = await client
      .from("disparos")
      .select("nome, telefone")
      .eq("respondeu", true);

<<<<<<< HEAD
    const hotListName = "Leads Quentes (Auto)";
    let { data: hotList } = await client
      .from("contact_lists")
      .select("id")
      .eq("name", hotListName)
=======
    // Find or create the auto hot leads contact list
    const HOT_LIST_NAME = "🔥 Leads Quentes (Auto)";
    let { data: hotList } = await client
      .from("contact_lists")
      .select("id")
      .eq("name", HOT_LIST_NAME)
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
      .maybeSingle();

    if (!hotList) {
      const { data: newList } = await client
        .from("contact_lists")
<<<<<<< HEAD
        .insert({ name: hotListName, type: "hot_leads" })
=======
        .insert({ name: HOT_LIST_NAME, type: "hot_leads" })
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
        .select("id")
        .single();
      hotList = newList;
    }

    if (!hotList) return;

<<<<<<< HEAD
=======
    // Clear old contacts and re-insert current hot leads
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
    await client.from("base_contacts").delete().eq("list_id", hotList.id);

    if (hotDisparos && hotDisparos.length > 0) {
      const batchSize = 500;
<<<<<<< HEAD
      for (let index = 0; index < hotDisparos.length; index += batchSize) {
        const batch = hotDisparos.slice(index, index + batchSize).map((contact: any) => ({
          list_id: hotList!.id,
          nome: contact.nome || null,
          telefone: contact.telefone,
=======
      for (let i = 0; i < hotDisparos.length; i += batchSize) {
        const batch = hotDisparos.slice(i, i + batchSize).map((c: any) => ({
          list_id: hotList!.id,
          nome: c.nome || null,
          telefone: c.telefone,
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
        }));
        await client.from("base_contacts").insert(batch);
      }
    }

<<<<<<< HEAD
    const hotSegName = "Leads Quentes (Auto)";
    let { data: hotSeg } = await client
      .from("segmentation_lists")
      .select("id")
      .eq("name", hotSegName)
=======
    // Find or create the auto segmentation
    const HOT_SEG_NAME = "🔥 Leads Quentes (Auto)";
    let { data: hotSeg } = await client
      .from("segmentation_lists")
      .select("id")
      .eq("name", HOT_SEG_NAME)
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
      .maybeSingle();

    if (!hotSeg) {
      const { data: newSeg } = await client
        .from("segmentation_lists")
<<<<<<< HEAD
        .insert({ name: hotSegName })
=======
        .insert({ name: HOT_SEG_NAME })
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
        .select("id")
        .single();
      hotSeg = newSeg;
    }

    if (!hotSeg) return;

<<<<<<< HEAD
=======
    // Ensure the link exists
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
    const { data: existingLink } = await client
      .from("segmentation_sources")
      .select("id")
      .eq("segmentation_id", hotSeg.id)
      .eq("contact_list_id", hotList.id)
      .maybeSingle();

    if (!existingLink) {
      await client.from("segmentation_sources").insert({
        segmentation_id: hotSeg.id,
        contact_list_id: hotList.id,
      });
    }
  };

  const fetchData = async () => {
    if (!client) return;
    setLoading(true);

<<<<<<< HEAD
=======
    // Auto-sync hot leads first
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
    await syncHotLeads();

    const { data: listsData } = await client
      .from("contact_lists")
      .select("id, name, type")
      .order("created_at", { ascending: false });

    if (listsData) {
      const withCounts = await Promise.all(
<<<<<<< HEAD
        listsData.map(async (list: any) => {
          const { count } = await client
            .from("base_contacts")
            .select("*", { count: "exact", head: true })
            .eq("list_id", list.id);

          return { ...list, contact_count: count || 0 };
        })
      );

=======
        listsData.map(async (l: any) => {
          const { count } = await client
            .from("base_contacts")
            .select("*", { count: "exact", head: true })
            .eq("list_id", l.id);
          return { ...l, contact_count: count || 0 };
        })
      );
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
      setContactLists(withCounts);
    }

    const { data: segsData } = await client
      .from("segmentation_lists")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });

    if (segsData) {
      const segsWithSources = await Promise.all(
<<<<<<< HEAD
        segsData.map(async (segmentation: any) => {
          const { data: sources } = await client
            .from("segmentation_sources")
            .select("contact_list_id")
            .eq("segmentation_id", segmentation.id);
=======
        segsData.map(async (s: any) => {
          const { data: sources } = await client
            .from("segmentation_sources")
            .select("contact_list_id")
            .eq("segmentation_id", s.id);
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47

          const sourceDetails: { id: string; name: string; type: string }[] = [];
          let totalContacts = 0;

          if (sources) {
<<<<<<< HEAD
            for (const source of sources) {
              const list = listsData?.find((item: any) => item.id === source.contact_list_id);
              if (!list) continue;

              sourceDetails.push({ id: list.id, name: list.name, type: list.type });
              const { count } = await client
                .from("base_contacts")
                .select("*", { count: "exact", head: true })
                .eq("list_id", list.id);

              totalContacts += count || 0;
            }
          }

          return { ...segmentation, sources: sourceDetails, total_contacts: totalContacts };
        })
      );

=======
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
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
      setSegments(segsWithSources);
    }

    setLoading(false);
  };

  const toggleList = (id: string) => {
<<<<<<< HEAD
    setSelectedListIds((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
=======
    setSelectedListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
    );
  };

  const handleCreate = async () => {
    if (!client) return;
<<<<<<< HEAD
    if (!segName.trim()) {
      toast.error("Dê um nome para a segmentação.");
      return;
    }
    if (selectedListIds.length === 0) {
      toast.error("Selecione pelo menos uma lista.");
      return;
    }

    setSaving(true);

    const { data: segmentation, error } = await client
=======
    if (!segName.trim()) { toast.error("Dê um nome para a segmentação."); return; }
    if (selectedListIds.length === 0) { toast.error("Selecione pelo menos uma lista."); return; }

    setSaving(true);

    const { data: seg, error } = await client
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
      .from("segmentation_lists")
      .insert({ name: segName.trim() })
      .select("id")
      .single();

<<<<<<< HEAD
    if (error || !segmentation) {
      toast.error("Erro ao criar segmentação.");
      setSaving(false);
      return;
    }

    const sources = selectedListIds.map((listId) => ({
      segmentation_id: segmentation.id,
=======
    if (error || !seg) { toast.error("Erro ao criar segmentação."); setSaving(false); return; }

    const sources = selectedListIds.map((listId) => ({
      segmentation_id: seg.id,
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
      contact_list_id: listId,
    }));

    await client.from("segmentation_sources").insert(sources);

<<<<<<< HEAD
    toast.success(`Segmentação "${segName}" criada.`);
=======
    toast.success(`Segmentação "${segName}" criada!`);
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
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
<<<<<<< HEAD
      setSegments((previous) => previous.filter((segment) => segment.id !== id));
=======
      setSegments((prev) => prev.filter((s) => s.id !== id));
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
      toast.success("Segmentação excluída.");
    }
  };

<<<<<<< HEAD
  const handleEditOpen = (segment: SegmentationList) => {
    setEditSegment(segment);
=======
  const handleEditOpen = (s: SegmentationList) => {
    setEditSegment(s);
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
    setEditUploadContacts([]);
    setEditFileName("");
    setEditListName("");
    setEditManualNome("");
    setEditManualTelefone("");
    setEditOpen(true);
  };

<<<<<<< HEAD
  const handleEditFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const data = loadEvent.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const startIdx =
          rows.length > 0 &&
          typeof rows[0][0] === "string" &&
          (rows[0][0].toLowerCase().includes("nome") || rows[0][0].toLowerCase().includes("name"))
            ? 1
            : 0;

        const parsed: { nome: string | null; telefone: string }[] = [];
        for (let index = startIdx; index < rows.length; index += 1) {
          const row = rows[index];
          if (!row || !row[1]) continue;
          parsed.push({
            nome: row[0] ? String(row[0]).trim() : null,
            telefone: String(row[1]).trim(),
          });
        }

        if (parsed.length === 0) {
          toast.error("Nenhum contato encontrado.");
        } else {
          setEditUploadContacts(parsed);
          setEditFileName(file.name);
          if (!editListName) {
            setEditListName(file.name.replace(/\.(xlsx|xls|csv)$/i, ""));
          }
          toast.success(`${parsed.length} contatos encontrados.`);
        }
      } catch {
        toast.error("Erro ao ler a planilha.");
      }
    };

    reader.readAsBinaryString(file);
    event.target.value = "";
=======
  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          parsed.push({ nome: row[0] ? String(row[0]).trim() : null, telefone: String(row[1]).trim() });
        }
        if (parsed.length === 0) { toast.error("Nenhum contato encontrado."); }
        else { setEditUploadContacts(parsed); setEditFileName(file.name); if (!editListName) setEditListName(file.name.replace(/\.(xlsx|xls|csv)$/i, "")); toast.success(`${parsed.length} contatos encontrados.`); }
      } catch { toast.error("Erro ao ler a planilha."); }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
  };

  const handleEditAddSpreadsheet = async () => {
    if (!client || !editSegment) return;
<<<<<<< HEAD
    if (!editListName.trim()) {
      toast.error("Dê um nome para a planilha.");
      return;
    }
    if (editUploadContacts.length === 0) {
      toast.error("Selecione uma planilha.");
      return;
    }

    setEditSaving(true);

    const { data: list } = await client
      .from("contact_lists")
      .insert({ name: editListName.trim(), type: "spreadsheet" })
      .select("id")
      .single();

    if (!list) {
      toast.error("Erro ao salvar.");
      setEditSaving(false);
      return;
    }

    const batchSize = 500;
    for (let index = 0; index < editUploadContacts.length; index += batchSize) {
      const batch = editUploadContacts.slice(index, index + batchSize).map((contact) => ({
        list_id: list.id,
        nome: contact.nome,
        telefone: contact.telefone,
      }));
      await client.from("base_contacts").insert(batch);
    }

    await client.from("segmentation_sources").insert({
      segmentation_id: editSegment.id,
      contact_list_id: list.id,
    });

    toast.success(`Planilha "${editListName}" adicionada à segmentação.`);
    setEditUploadContacts([]);
    setEditFileName("");
    setEditListName("");
=======
    if (!editListName.trim()) { toast.error("Dê um nome para a planilha."); return; }
    if (editUploadContacts.length === 0) { toast.error("Selecione uma planilha."); return; }
    setEditSaving(true);

    const { data: list } = await client.from("contact_lists").insert({ name: editListName.trim(), type: "spreadsheet" }).select("id").single();
    if (!list) { toast.error("Erro ao salvar."); setEditSaving(false); return; }

    const batchSize = 500;
    for (let i = 0; i < editUploadContacts.length; i += batchSize) {
      const batch = editUploadContacts.slice(i, i + batchSize).map((c) => ({ list_id: list.id, nome: c.nome, telefone: c.telefone }));
      await client.from("base_contacts").insert(batch);
    }

    await client.from("segmentation_sources").insert({ segmentation_id: editSegment.id, contact_list_id: list.id });
    toast.success(`Planilha "${editListName}" adicionada à segmentação!`);
    setEditUploadContacts([]); setEditFileName(""); setEditListName("");
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
    fetchData();
    setEditSaving(false);
  };

  const handleEditAddManual = async () => {
    if (!client || !editSegment) return;
<<<<<<< HEAD
    if (!editManualTelefone.trim()) {
      toast.error("Informe o telefone.");
      return;
    }

    setEditSaving(true);

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

    if (!manualList) {
      toast.error("Erro ao criar lista.");
      setEditSaving(false);
      return;
    }

    await client.from("base_contacts").insert({
      list_id: manualList.id,
      nome: editManualNome.trim() || null,
      telefone: editManualTelefone.trim(),
    });

    const { data: existing } = await client
      .from("segmentation_sources")
      .select("id")
      .eq("segmentation_id", editSegment.id)
      .eq("contact_list_id", manualList.id)
      .maybeSingle();

    if (!existing) {
      await client.from("segmentation_sources").insert({
        segmentation_id: editSegment.id,
        contact_list_id: manualList.id,
      });
    }

    toast.success("Contato adicionado à segmentação.");
    setEditManualNome("");
    setEditManualTelefone("");
=======
    if (!editManualTelefone.trim()) { toast.error("Informe o telefone."); return; }
    setEditSaving(true);

    // Find or create "Contatos Avulsos" list linked to this segmentation
    let { data: manualList } = await client.from("contact_lists").select("id").eq("type", "manual").maybeSingle();
    if (!manualList) {
      const { data: newList } = await client.from("contact_lists").insert({ name: "Contatos Avulsos", type: "manual" }).select("id").single();
      manualList = newList;
    }
    if (!manualList) { toast.error("Erro ao criar lista."); setEditSaving(false); return; }

    await client.from("base_contacts").insert({ list_id: manualList.id, nome: editManualNome.trim() || null, telefone: editManualTelefone.trim() });

    // Ensure this list is linked to the segmentation
    const { data: existing } = await client.from("segmentation_sources").select("id").eq("segmentation_id", editSegment.id).eq("contact_list_id", manualList.id).maybeSingle();
    if (!existing) {
      await client.from("segmentation_sources").insert({ segmentation_id: editSegment.id, contact_list_id: manualList.id });
    }

    toast.success("Contato adicionado à segmentação!");
    setEditManualNome(""); setEditManualTelefone("");
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
    fetchData();
    setEditSaving(false);
  };

<<<<<<< HEAD
  const renderSourceIcon = (type: string, className = "h-4 w-4 text-primary shrink-0") => {
    if (type === "manual") return <UserPlus className={className} />;
    if (type === "exact_spotter") return <Link2 className={className} />;
    return <FileSpreadsheet className={className} />;
  };

=======
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Segmentação</h2>
<<<<<<< HEAD
            <p className="text-sm text-muted-foreground">
              Crie listas de segmentação combinando planilhas e contatos da sua base.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/segmentacao/exact-spotter")}>
              <Link2 className="h-4 w-4" />
              Criar com Exact Spotter
            </Button>
=======
            <p className="text-sm text-muted-foreground">Crie listas de segmentação combinando planilhas e contatos da sua base.</p>
          </div>
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Segmentação
                </Button>
              </DialogTrigger>
<<<<<<< HEAD
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
                      onChange={(event) => setSegName(event.target.value)}
                      className="bg-secondary border-border"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Selecione as listas de contatos</Label>
                    {contactLists.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma lista encontrada. Suba uma planilha primeiro na Base de Contatos.
                      </p>
                    ) : (
                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                        {contactLists.map((list) => (
                          <div
                            key={list.id}
                            className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-secondary/50"
                            onClick={() => toggleList(list.id)}
                          >
                            <Checkbox
                              checked={selectedListIds.includes(list.id)}
                              onCheckedChange={() => toggleList(list.id)}
                            />
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              {renderSourceIcon(list.type)}
                              <span className="truncate text-sm">{list.name}</span>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {list.contact_count} contatos
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedListIds.length > 0 && (
                      <p className="text-sm font-medium text-primary">
                        {selectedListIds.length} lista(s) selecionada(s)
                      </p>
                    )}
                  </div>
                  <Button onClick={handleCreate} disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Criar Segmentação"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
=======
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
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
<<<<<<< HEAD
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
=======
            <CardTitle className="text-base font-semibold flex items-center gap-2">
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
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
<<<<<<< HEAD
                {segments.map((segment) => (
                  <div key={segment.id} className="rounded-lg border border-border bg-secondary/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Layers className="h-4 w-4 text-primary" />
                          {segment.name}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {segment.total_contacts} contatos • {segment.sources.length} lista(s) •{" "}
                          {new Date(segment.created_at).toLocaleDateString("pt-BR")}
=======
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
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
<<<<<<< HEAD
                          onClick={() => handleEditOpen(segment)}
=======
                          onClick={() => handleEditOpen(s)}
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
<<<<<<< HEAD
                          onClick={() => {
                            setViewSegment(segment);
                            setViewOpen(true);
                          }}
=======
                          onClick={() => { setViewSegment(s); setViewOpen(true); }}
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
<<<<<<< HEAD
                          onClick={() => handleDelete(segment.id)}
=======
                          onClick={() => handleDelete(s.id)}
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                          className="h-8 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
<<<<<<< HEAD
                      {segment.sources.map((source) => (
                        <span
                          key={source.id}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                        >
                          {renderSourceIcon(source.type, "h-3 w-3")}
                          {source.name}
=======
                      {s.sources.map((src) => (
                        <span key={src.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                          {src.type === "manual" ? <UserPlus className="h-3 w-3" /> : <FileSpreadsheet className="h-3 w-3" />}
                          {src.name}
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
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
<<<<<<< HEAD
                {viewSegment?.sources.map((source) => (
                  <div key={source.id} className="flex items-center gap-2 rounded-md border border-border p-2.5">
                    {renderSourceIcon(source.type, "h-4 w-4 text-primary")}
                    <span className="text-sm">{source.name}</span>
=======
                {viewSegment?.sources.map((src) => (
                  <div key={src.id} className="flex items-center gap-2 rounded-md border border-border p-2.5">
                    {src.type === "manual" ? <UserPlus className="h-4 w-4 text-primary" /> : <FileSpreadsheet className="h-4 w-4 text-primary" />}
                    <span className="text-sm">{src.name}</span>
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

<<<<<<< HEAD
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto bg-card border-border sm:max-w-lg">
=======
        {/* Edit segmentation dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="bg-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
            <DialogHeader>
              <DialogTitle>Editar Segmentação — {editSegment?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
<<<<<<< HEAD
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Listas atuais:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {editSegment?.sources.map((source) => (
                    <span
                      key={source.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                    >
                      {renderSourceIcon(source.type, "h-3 w-3")}
                      {source.name}
=======
              {/* Current sources */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Listas atuais:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {editSegment?.sources.map((src) => (
                    <span key={src.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                      {src.type === "manual" ? <UserPlus className="h-3 w-3" /> : <FileSpreadsheet className="h-3 w-3" />}
                      {src.name}
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                    </span>
                  ))}
                </div>
              </div>

<<<<<<< HEAD
              <div className="space-y-3 rounded-lg border border-border p-4">
                <Label className="flex items-center gap-2 text-sm font-medium">
=======
              {/* Import spreadsheet */}
              <div className="space-y-3 rounded-lg border border-border p-4">
                <Label className="text-sm font-medium flex items-center gap-2">
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                  <Upload className="h-4 w-4" />
                  Importar Planilha
                </Label>
                <Input
                  placeholder="Nome da planilha"
                  value={editListName}
<<<<<<< HEAD
                  onChange={(event) => setEditListName(event.target.value)}
=======
                  onChange={(e) => setEditListName(e.target.value)}
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                  className="bg-secondary border-border"
                  maxLength={100}
                />
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleEditFileUpload}
                  className="hidden"
                />
<<<<<<< HEAD
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => editFileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Selecionar arquivo
                </Button>
                {editFileName && <p className="text-xs text-muted-foreground">{editFileName}</p>}
                {editUploadContacts.length > 0 && (
                  <>
                    <p className="text-sm font-medium text-primary">{editUploadContacts.length} contatos encontrados</p>
                    <div className="max-h-32 overflow-y-auto overflow-hidden rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border">
                            <TableHead className="text-xs text-muted-foreground">Nome</TableHead>
                            <TableHead className="text-xs text-muted-foreground">Telefone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editUploadContacts.slice(0, 5).map((contact, index) => (
                            <TableRow key={index} className="border-border">
                              <TableCell className="py-1.5 text-sm">{contact.nome || "—"}</TableCell>
                              <TableCell className="py-1.5 text-sm font-mono">{contact.telefone}</TableCell>
                            </TableRow>
                          ))}
                          {editUploadContacts.length > 5 && (
                            <TableRow>
                              <TableCell colSpan={2} className="py-2 text-center text-xs text-muted-foreground">
                                ... e mais {editUploadContacts.length - 5}
                              </TableCell>
                            </TableRow>
=======
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => editFileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Selecionar arquivo
                </Button>
                {editFileName && <p className="text-xs text-muted-foreground">📄 {editFileName}</p>}
                {editUploadContacts.length > 0 && (
                  <>
                    <p className="text-sm text-primary font-medium">✓ {editUploadContacts.length} contatos encontrados</p>
                    <div className="rounded-lg border border-border overflow-hidden max-h-32 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border">
                            <TableHead className="text-muted-foreground text-xs">Nome</TableHead>
                            <TableHead className="text-muted-foreground text-xs">Telefone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editUploadContacts.slice(0, 5).map((c, i) => (
                            <TableRow key={i} className="border-border">
                              <TableCell className="text-sm py-1.5">{c.nome || "—"}</TableCell>
                              <TableCell className="text-sm font-mono py-1.5">{c.telefone}</TableCell>
                            </TableRow>
                          ))}
                          {editUploadContacts.length > 5 && (
                            <TableRow><TableCell colSpan={2} className="text-xs text-muted-foreground text-center py-2">... e mais {editUploadContacts.length - 5}</TableCell></TableRow>
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
<<<<<<< HEAD
                <Button
                  onClick={handleEditAddSpreadsheet}
                  disabled={editSaving || editUploadContacts.length === 0}
                  className="w-full"
                >
                  {editSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Adicionar Planilha"
                  )}
                </Button>
              </div>

              <div className="space-y-3 rounded-lg border border-border p-4">
                <Label className="flex items-center gap-2 text-sm font-medium">
=======
                <Button onClick={handleEditAddSpreadsheet} disabled={editSaving || editUploadContacts.length === 0} className="w-full">
                  {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Adicionar Planilha"}
                </Button>
              </div>

              {/* Add manual contact */}
              <div className="space-y-3 rounded-lg border border-border p-4">
                <Label className="text-sm font-medium flex items-center gap-2">
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                  <UserPlus className="h-4 w-4" />
                  Adicionar Contato Avulso
                </Label>
                <Input
                  placeholder="Nome (opcional)"
                  value={editManualNome}
<<<<<<< HEAD
                  onChange={(event) => setEditManualNome(event.target.value)}
=======
                  onChange={(e) => setEditManualNome(e.target.value)}
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                  className="bg-secondary border-border"
                  maxLength={100}
                />
                <Input
                  placeholder="+55 11 99999-9999"
                  value={editManualTelefone}
<<<<<<< HEAD
                  onChange={(event) => setEditManualTelefone(event.target.value)}
=======
                  onChange={(e) => setEditManualTelefone(e.target.value)}
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                  className="bg-secondary border-border"
                  maxLength={20}
                />
                <Button onClick={handleEditAddManual} disabled={editSaving} className="w-full">
<<<<<<< HEAD
                  {editSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Adicionar Contato"
                  )}
=======
                  {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Adicionar Contato"}
>>>>>>> f5e96e4bbdf821c34c7b2fcc682028a9c93acf47
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
