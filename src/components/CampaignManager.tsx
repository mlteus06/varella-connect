import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createExternalClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Upload, Trash2, Users, Send, FileSpreadsheet, Eye, Copy } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Template {
  id: string;
  title: string;
  content: string;
}

interface Campaign {
  id: string;
  name: string;
  created_at: string;
  contact_count?: number;
}

interface Contact {
  nome: string | null;
  telefone: string;
}

export function CampaignManager({ templates }: { templates: Template[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  // Create campaign state
  const [campaignName, setCampaignName] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [contactSource, setContactSource] = useState<"file" | "campaign">("file");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [loadingImport, setLoadingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View contacts state
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
  const [viewContacts, setViewContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Send state
  const [sendCampaign, setSendCampaign] = useState<Campaign | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data: campaignsData } = await supabase
      .from("campaigns")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });

    if (campaignsData) {
      // Get contact counts
      const campaignsWithCounts = await Promise.all(
        campaignsData.map(async (c) => {
          const { count } = await supabase
            .from("campaign_contacts")
            .select("*", { count: "exact", head: true })
            .eq("campaign_id", c.id);
          return { ...c, contact_count: count || 0 };
        })
      );
      setCampaigns(campaignsWithCounts);
    }
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

        const parsed: Contact[] = [];
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
          setContacts((prev) => [...prev, ...parsed]);
          setFileNames((prev) => [...prev, file.name]);
          toast.success(`${parsed.length} contatos adicionados de "${file.name}".`);
        }
      } catch {
        toast.error("Erro ao ler a planilha. Verifique o formato.");
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleImportFromCampaign = async (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setLoadingImport(true);
    const { data } = await supabase
      .from("campaign_contacts")
      .select("nome, telefone")
      .eq("campaign_id", campaignId);
    if (data && data.length > 0) {
      setContacts(data);
      const camp = campaigns.find((c) => c.id === campaignId);
      setFileNames([`Importado de "${camp?.name}"`]);
      toast.success(`${data.length} contatos importados.`);
    } else {
      toast.error("Nenhum contato encontrado nessa campanha.");
    }
    setLoadingImport(false);
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error("Dê um nome para a campanha.");
      return;
    }
    if (contacts.length === 0) {
      toast.error("Selecione uma planilha ou importe de uma campanha existente.");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({ user_id: user.id, name: campaignName.trim() })
      .select("id")
      .single();

    if (error || !campaign) {
      toast.error("Erro ao criar campanha.");
      setSaving(false);
      return;
    }

    // Insert contacts in batches of 500
    const batchSize = 500;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize).map((c) => ({
        campaign_id: campaign.id,
        nome: c.nome,
        telefone: c.telefone,
      }));
      await supabase.from("campaign_contacts").insert(batch);
    }

    toast.success(`Campanha "${campaignName}" criada com ${contacts.length} contatos!`);
    setCampaignName("");
    setContacts([]);
    setFileNames([]);
    setContactSource("file");
    setSelectedCampaignId("");
    setCreateOpen(false);
    fetchCampaigns();
    setSaving(false);
  };

  const handleDeleteCampaign = async (id: string) => {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (!error) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campanha excluída.");
    }
  };

  const handleViewContacts = async (campaign: Campaign) => {
    setViewCampaign(campaign);
    setViewOpen(true);
    setLoadingContacts(true);
    const { data } = await supabase
      .from("campaign_contacts")
      .select("nome, telefone")
      .eq("campaign_id", campaign.id);
    setViewContacts(data || []);
    setLoadingContacts(false);
  };

  const handleOpenSend = (campaign: Campaign) => {
    setSendCampaign(campaign);
    setSelectedTemplateId("");
    setSendOpen(true);
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplateId || !sendCampaign) return;

    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    const client = createExternalClient();
    if (!client) {
      toast.error("Conexão com Supabase externo não encontrada.");
      return;
    }

    setSending(true);

    // Fetch contacts
    const { data: contactsData } = await supabase
      .from("campaign_contacts")
      .select("nome, telefone")
      .eq("campaign_id", sendCampaign.id);

    if (!contactsData || contactsData.length === 0) {
      toast.error("Nenhum contato nesta campanha.");
      setSending(false);
      return;
    }

    // Insert all contacts as disparos with template message
    const disparos = contactsData.map((c) => ({
      nome: c.nome,
      telefone: c.telefone,
      mensagem: template.content,
      status: "PENDENTE",
    }));

    const batchSize = 500;
    let successCount = 0;
    for (let i = 0; i < disparos.length; i += batchSize) {
      const batch = disparos.slice(i, i + batchSize);
      const { error } = await client.from("disparos").insert(batch);
      if (!error) successCount += batch.length;
    }

    toast.success(`${successCount} disparos criados com o template "${template.title}"!`);
    setSending(false);
    setSendOpen(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Campanhas
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            Suba planilhas de contatos e envie templates em massa.
          </CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Campanha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome da Campanha</Label>
                <Input
                  placeholder="Ex: Promoção Janeiro, Clientes VIP..."
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="bg-secondary border-border"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Origem dos Contatos</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={contactSource === "file" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => { setContactSource("file"); setContacts([]); setFileName(""); setSelectedCampaignId(""); }}
                  >
                    <Upload className="h-4 w-4" />
                    Nova Planilha
                  </Button>
                  <Button
                    type="button"
                    variant={contactSource === "campaign" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-2"
                    disabled={campaigns.length === 0}
                    onClick={() => { setContactSource("campaign"); setContacts([]); setFileName(""); }}
                  >
                    <Copy className="h-4 w-4" />
                    Campanha Existente
                  </Button>
                </div>
              </div>

              {contactSource === "file" ? (
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
                    {fileName || "Selecionar planilha (.xlsx, .xls, .csv)"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Selecione uma campanha para importar os contatos dela.
                  </p>
                  <Select value={selectedCampaignId} onValueChange={handleImportFromCampaign}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Escolha uma campanha..." />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.contact_count} contatos)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingImport && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Importando...
                    </div>
                  )}
                </div>
              )}

              {contacts.length > 0 && (
                <p className="text-sm text-primary font-medium">
                  ✓ {contacts.length} contatos carregados
                </p>
              )}

              {contacts.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground text-xs">Nome</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Telefone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.slice(0, 10).map((c, i) => (
                        <TableRow key={i} className="border-border">
                          <TableCell className="text-sm py-1.5">{c.nome || "—"}</TableCell>
                          <TableCell className="text-sm font-mono py-1.5">{c.telefone}</TableCell>
                        </TableRow>
                      ))}
                      {contacts.length > 10 && (
                        <TableRow className="border-border">
                          <TableCell colSpan={2} className="text-xs text-muted-foreground text-center py-2">
                            ... e mais {contacts.length - 10} contatos
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Button onClick={handleCreateCampaign} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Criar Campanha"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma campanha criada ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border bg-secondary/50 p-4 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm text-foreground flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    {c.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.contact_count} contatos • {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewContacts(c)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenSend(c)}
                    className="h-8 gap-1.5 text-xs text-primary hover:text-primary"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Enviar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCampaign(c.id)}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* View contacts dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Contatos — {viewCampaign?.name}</DialogTitle>
          </DialogHeader>
          {loadingContacts ? (
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
                  {viewContacts.map((c, i) => (
                    <TableRow key={i} className="border-border">
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

      {/* Send campaign dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Enviar Campanha — {sendCampaign?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Selecione o Template de Mensagem</Label>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Crie um template de mensagem primeiro.
                </p>
              ) : (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Escolha um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedTemplateId && (
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {templates.find((t) => t.id === selectedTemplateId)?.content}
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Isso criará <strong>{sendCampaign?.contact_count}</strong> disparos com status PENDENTE.
            </p>
            <Button
              onClick={handleSendCampaign}
              disabled={sending || !selectedTemplateId}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Criar Disparos"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
