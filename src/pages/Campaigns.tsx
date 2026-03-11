import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { createExternalClient, getSupabaseConfig, loadConfigFromCloud } from "@/lib/supabase-client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Megaphone, FileSpreadsheet, Layers, Send, Clock, CheckCircle, AlertCircle, ChevronDown, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ContactList {
  id: string;
  name: string;
  type: string;
  contact_count: number;
}

interface SegmentationListItem {
  id: string;
  name: string;
  total_contacts: number;
}

interface Template {
  id: string;
  title: string;
  content: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  template_title?: string;
}

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [segmentations, setSegmentations] = useState<SegmentationListItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<SupabaseClient | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedSegIds, setSelectedSegIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("09:00");

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

    // Campaigns
    const { data: campsData } = await client
      .from("campaigns")
      .select("id, name, status, created_at, template_id")
      .order("created_at", { ascending: false });

    if (campsData) {
      const templateIds = [...new Set(campsData.filter((c: any) => c.template_id).map((c: any) => c.template_id))];
      let templateMap: Record<string, string> = {};
      if (templateIds.length > 0) {
        const { data: tpls } = await client
          .from("message_templates")
          .select("id, title")
          .in("id", templateIds);
        if (tpls) {
          tpls.forEach((t: any) => { templateMap[t.id] = t.title; });
        }
      }
      setCampaigns(campsData.map((c: any) => ({
        ...c,
        template_title: c.template_id ? templateMap[c.template_id] || "—" : "—"
      })));
    }

    // Contact lists
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

    // Segmentation lists
    const { data: segsData } = await client
      .from("segmentation_lists")
      .select("id, name")
      .order("created_at", { ascending: false });

    if (segsData) {
      const withContacts = await Promise.all(
        segsData.map(async (s: any) => {
          const { data: sources } = await client
            .from("segmentation_sources")
            .select("contact_list_id")
            .eq("segmentation_id", s.id);

          let total = 0;
          if (sources) {
            for (const src of sources) {
              const { count } = await client
                .from("base_contacts")
                .select("*", { count: "exact", head: true })
                .eq("list_id", src.contact_list_id);
              total += count || 0;
            }
          }
          return { ...s, total_contacts: total };
        })
      );
      setSegmentations(withContacts);
    }

    // Templates
    const { data: tplsData } = await client
      .from("message_templates")
      .select("id, title, content")
      .order("created_at", { ascending: false });
    if (tplsData) setTemplates(tplsData);

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enviado":
        return <Badge className="bg-green-500/10 text-green-500 border-none text-xs">Enviado</Badge>;
      case "enviando":
        return <Badge className="bg-blue-500/10 text-blue-500 border-none text-xs">Enviando</Badge>;
      default:
        return <Badge className="bg-status-pending text-status-pending-foreground border-none text-xs">Pendente</Badge>;
    }
  };

  const handleCreateCampaign = async () => {
    if (!client) return;
    if (!campaignName.trim()) { toast.error("Dê um nome para a campanha."); return; }
    if (selectedListIds.length === 0 && selectedSegIds.length === 0) { toast.error("Selecione pelo menos uma planilha ou segmentação."); return; }
    if (!selectedTemplateId) { toast.error("Selecione um template."); return; }

    setSaving(true);

    // Build scheduled_at if scheduling
    let scheduledAt: string | null = null;
    if (isScheduled) {
      if (!scheduledDate) { toast.error("Selecione a data do agendamento."); setSaving(false); return; }
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const dt = new Date(scheduledDate);
      dt.setHours(hours, minutes, 0, 0);
      if (dt <= new Date()) { toast.error("A data/hora deve ser no futuro."); setSaving(false); return; }
      scheduledAt = dt.toISOString();
    }

    // Create campaign
    const { data: campaign, error } = await client
      .from("campaigns")
      .insert({
        name: campaignName.trim(),
        status: isScheduled ? "agendado" : "pendente",
        template_id: selectedTemplateId,
        scheduled_at: scheduledAt,
      })
      .select("id")
      .single();

    if (error || !campaign) { toast.error("Erro ao criar campanha."); setSaving(false); return; }

    // Insert campaign sources
    const sources: { campaign_id: string; source_type: string; source_id: string }[] = [];
    selectedListIds.forEach((id) => sources.push({ campaign_id: campaign.id, source_type: "list", source_id: id }));
    selectedSegIds.forEach((id) => sources.push({ campaign_id: campaign.id, source_type: "segmentation", source_id: id }));

    if (sources.length > 0) {
      await client.from("campaign_sources").insert(sources);
    }

    // Collect all contacts (deduplicate by phone)
    const allPhones = new Map<string, { nome: string | null; telefone: string }>();

    for (const listId of selectedListIds) {
      const { data: contacts } = await client
        .from("base_contacts")
        .select("nome, telefone")
        .eq("list_id", listId);
      contacts?.forEach((c: any) => {
        if (!allPhones.has(c.telefone)) allPhones.set(c.telefone, c);
      });
    }

    for (const segId of selectedSegIds) {
      const { data: segSources } = await client
        .from("segmentation_sources")
        .select("contact_list_id")
        .eq("segmentation_id", segId);
      if (segSources) {
        for (const src of segSources) {
          const { data: contacts } = await client
            .from("base_contacts")
            .select("nome, telefone")
            .eq("list_id", src.contact_list_id);
          contacts?.forEach((c: any) => {
            if (!allPhones.has(c.telefone)) allPhones.set(c.telefone, c);
          });
        }
      }
    }

    // Save to campaign_contacts
    const contactsArray = Array.from(allPhones.values());
    const batchSize = 500;
    for (let i = 0; i < contactsArray.length; i += batchSize) {
      const batch = contactsArray.slice(i, i + batchSize).map((c) => ({
        campaign_id: campaign.id,
        nome: c.nome,
        telefone: c.telefone,
      }));
      await client.from("campaign_contacts").insert(batch);
    }

    // Create disparos only if NOT scheduled
    if (!isScheduled) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        const disparos = contactsArray.map((c) => ({
          nome: c.nome,
          telefone: c.telefone,
          mensagem: template.content,
          status: "PENDENTE",
        }));

        for (let i = 0; i < disparos.length; i += batchSize) {
          const batch = disparos.slice(i, i + batchSize);
          await client.from("disparos").insert(batch);
        }
      }
    }

    const successMsg = isScheduled
      ? `Campanha "${campaignName}" agendada para ${format(scheduledDate!, "dd/MM/yyyy")} às ${scheduledTime}!`
      : `Campanha "${campaignName}" criada com ${contactsArray.length} contatos!`;
    toast.success(successMsg);
    setCampaignName("");
    setSelectedListIds([]);
    setSelectedSegIds([]);
    setSelectedTemplateId("");
    setIsScheduled(false);
    setScheduledDate(undefined);
    setScheduledTime("09:00");
    setCreateOpen(false);
    fetchData();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!client) return;
    const { error } = await client.from("campaigns").delete().eq("id", id);
    if (!error) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campanha excluída.");
    }
  };

  const toggleList = (id: string) => {
    setSelectedListIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSeg = (id: string) => {
    setSelectedSegIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Campanhas</h2>
            <p className="text-sm text-muted-foreground">Gerencie e crie campanhas de disparo.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Campanha</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label>Nome da Campanha</Label>
                  <Input
                    placeholder="Ex: Promoção Janeiro, Black Friday..."
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="bg-secondary border-border"
                    maxLength={100}
                  />
                </div>

                {/* Select contact lists */}
                <div className="space-y-2">
                  <Label>Planilhas da Base de Contatos</Label>
                  {contactLists.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma planilha na base. Suba uma planilha primeiro.</p>
                  ) : (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <button className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground hover:bg-secondary/80 transition-colors">
                          <span>{selectedListIds.length > 0 ? `${selectedListIds.length} planilha(s) selecionada(s)` : "Selecione as planilhas..."}</span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-1 space-y-0.5 rounded-lg border border-border bg-secondary/30 p-1.5 max-h-48 overflow-y-auto">
                          {contactLists.map((l) => (
                            <div
                              key={l.id}
                              className="flex items-center gap-3 rounded-md px-2.5 py-2 hover:bg-secondary/80 cursor-pointer transition-colors"
                              onClick={() => toggleList(l.id)}
                            >
                              <Checkbox checked={selectedListIds.includes(l.id)} onCheckedChange={() => toggleList(l.id)} />
                              <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-sm truncate flex-1">{l.name}</span>
                              <span className="text-xs text-muted-foreground">{l.contact_count}</span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>

                {/* Select segmentations */}
                <div className="space-y-2">
                  <Label>Listas de Segmentação</Label>
                  {segmentations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma segmentação criada.</p>
                  ) : (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <button className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground hover:bg-secondary/80 transition-colors">
                          <span>{selectedSegIds.length > 0 ? `${selectedSegIds.length} segmentação(ões) selecionada(s)` : "Selecione as segmentações..."}</span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-1 space-y-0.5 rounded-lg border border-border bg-secondary/30 p-1.5 max-h-48 overflow-y-auto">
                          {segmentations.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-3 rounded-md px-2.5 py-2 hover:bg-secondary/80 cursor-pointer transition-colors"
                              onClick={() => toggleSeg(s.id)}
                            >
                              <Checkbox checked={selectedSegIds.includes(s.id)} onCheckedChange={() => toggleSeg(s.id)} />
                              <Layers className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-sm truncate flex-1">{s.name}</span>
                              <span className="text-xs text-muted-foreground">{s.total_contacts}</span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>

                {/* Select template */}
                <div className="space-y-2">
                  <Label>Template de Mensagem</Label>
                  {templates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Crie um template primeiro na página de Templates.</p>
                  ) : (
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Escolha um template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
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

                <Button onClick={handleCreateCampaign} disabled={saving} className="w-full">
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Disparando...</> : "Disparar Campanha"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Todas as Campanhas
            </CardTitle>
            <CardDescription>{campaigns.length} campanha(s).</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma campanha criada ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-secondary/50 p-4 flex items-center justify-between">
                    <div className="space-y-1.5">
                      <button
                        onClick={() => navigate(`/campanha/${c.id}`)}
                        className="font-medium text-sm text-foreground flex items-center gap-2 hover:text-primary transition-colors text-left"
                      >
                        <Megaphone className="h-4 w-4 text-primary" />
                        {c.name}
                      </button>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {getStatusBadge(c.status)}
                        <span>Template: {c.template_title}</span>
                        <span>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(c.id)}
                      className="h-8 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
