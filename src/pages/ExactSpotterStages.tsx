import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, ListTree, Download, ArchiveX } from "lucide-react";
import { createExternalClient, getExactTokenFromCloud, getSupabaseConfig } from "@/lib/supabase-client";
import {
  ExactStage,
  buildExactDiscardedSegmentationName,
  buildExactSegmentationName,
  fetchExactContactsByFunnel,
  fetchExactContactsByStage,
  fetchExactDiscardedContactsByFunnel,
  fetchExactStages,
} from "@/lib/exact-spotter";
import { toast } from "sonner";

interface LocationState {
  funnelName?: string;
  focusDiscarded?: boolean;
}

export default function ExactSpotterStages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { funnelId } = useParams<{ funnelId: string }>();
  const [stages, setStages] = useState<ExactStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [importingStageId, setImportingStageId] = useState<number | null>(null);
  const [importingAllContacts, setImportingAllContacts] = useState(false);
  const [importingDiscarded, setImportingDiscarded] = useState(false);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const discardedCardRef = useRef<HTMLDivElement | null>(null);

  const funnelName = (location.state as LocationState | null)?.funnelName ?? "Funil";
  const focusDiscarded = (location.state as LocationState | null)?.focusDiscarded ?? false;
  const parsedFunnelId = useMemo(() => Number(funnelId), [funnelId]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        setPageError(null);

        if (!getSupabaseConfig()) {
          toast.error("Configure o Supabase antes de usar essa integracao.");
          navigate("/onboarding");
          return;
        }

        if (!funnelId || Number.isNaN(parsedFunnelId)) {
          navigate("/segmentacao/exact-spotter");
          return;
        }

        const externalClient = createExternalClient();
        if (!externalClient) {
          toast.error("Nao foi possivel acessar a configuracao atual do Supabase.");
          navigate("/onboarding");
          return;
        }

        const tokenExact = await getExactTokenFromCloud();
        if (!tokenExact) {
          toast.error("Salve o token do Exact Spotter antes de importar.");
          navigate("/integracoes");
          return;
        }

        if (active) {
          setClient(externalClient);
        }

        const data = await fetchExactStages(tokenExact, parsedFunnelId);
        if (active) {
          setStages(data);
        }
      } catch (error: any) {
        const message = error?.message || "Nao foi possivel carregar as etapas do funil.";
        if (active) {
          setPageError(message);
          toast.error(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [funnelId, navigate, parsedFunnelId]);

  useEffect(() => {
    if (!loading && focusDiscarded && discardedCardRef.current) {
      discardedCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusDiscarded, loading]);

  const createSegmentationFromContacts = async (segmentationName: string, contacts: { nome: string | null; telefone: string }[]) => {
    if (!client) {
      throw new Error("Cliente do Supabase externo nao encontrado.");
    }

    const { data: contactList, error: contactListError } = await client
      .from("contact_lists")
      .insert({ name: segmentationName, type: "exact_spotter" })
      .select("id")
      .single();

    if (contactListError || !contactList) {
      throw new Error("Nao foi possivel criar a lista de contatos no Disparador.");
    }

    const batchSize = 500;
    for (let index = 0; index < contacts.length; index += batchSize) {
      const batch = contacts.slice(index, index + batchSize).map((contact) => ({
        list_id: contactList.id,
        nome: contact.nome,
        telefone: contact.telefone,
      }));

      const { error } = await client.from("base_contacts").insert(batch);
      if (error) {
        throw new Error("Nao foi possivel salvar os contatos importados.");
      }
    }

    const { data: segmentation, error: segmentationError } = await client
      .from("segmentation_lists")
      .insert({ name: segmentationName })
      .select("id")
      .single();

    if (segmentationError || !segmentation) {
      throw new Error("Nao foi possivel criar a segmentacao importada.");
    }

    const { error: sourceError } = await client.from("segmentation_sources").insert({
      segmentation_id: segmentation.id,
      contact_list_id: contactList.id,
    });

    if (sourceError) {
      throw new Error("Nao foi possivel vincular a lista a segmentacao.");
    }
  };

  const handleImportStage = async (stage: ExactStage) => {
    if (!client) return;

    const tokenExact = await getExactTokenFromCloud();
    if (!tokenExact) {
      toast.error("Token do Exact Spotter nao encontrado.");
      navigate("/integracoes");
      return;
    }

    setImportingStageId(stage.id);

    try {
      const contacts = await fetchExactContactsByStage(tokenExact, parsedFunnelId, stage.value);
      if (contacts.length === 0) {
        toast.error("Essa etapa nao retornou contatos com telefone.");
        return;
      }

      const segmentationName = buildExactSegmentationName(funnelName, stage.value);
      await createSegmentationFromContacts(segmentationName, contacts);

      toast.success(`Segmentacao criada com ${contacts.length} contatos.`);
      navigate("/segmentacao");
    } catch (error: any) {
      toast.error(error?.message || "Nao foi possivel importar os contatos da etapa.");
    } finally {
      setImportingStageId(null);
    }
  };

  const handleImportAllContactsByFunnel = async () => {
    const tokenExact = await getExactTokenFromCloud();
    if (!tokenExact) {
      toast.error("Token do Exact Spotter nao encontrado.");
      navigate("/integracoes");
      return;
    }

    setImportingAllContacts(true);

    try {
      const contacts = await fetchExactContactsByFunnel(tokenExact, parsedFunnelId);
      if (contacts.length === 0) {
        toast.error("Nao encontramos contatos ativos com telefone nesse funil.");
        return;
      }

      const segmentationName = `Exact Spotter - ${funnelName} - Todos os contatos - ${new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date())}`;

      await createSegmentationFromContacts(segmentationName, contacts);

      toast.success(`Segmentacao criada com ${contacts.length} contatos do funil.`);
      navigate("/segmentacao");
    } catch (error: any) {
      toast.error(error?.message || "Nao foi possivel importar todos os contatos do funil.");
    } finally {
      setImportingAllContacts(false);
    }
  };

  const handleImportDiscardedByFunnel = async () => {
    if (!client) return;

    const tokenExact = await getExactTokenFromCloud();
    if (!tokenExact) {
      toast.error("Token do Exact Spotter nao encontrado.");
      navigate("/integracoes");
      return;
    }

    setImportingDiscarded(true);

    try {
      const contacts = await fetchExactDiscardedContactsByFunnel(tokenExact, parsedFunnelId);
      if (contacts.length === 0) {
        toast.error("Nao encontramos leads descartados com telefone nesse funil.");
        return;
      }

      const segmentationName = `${buildExactDiscardedSegmentationName()} - ${funnelName}`;

      const { data: contactList, error: contactListError } = await client
        .from("contact_lists")
        .insert({ name: segmentationName, type: "exact_spotter" })
        .select("id")
        .single();

      if (contactListError || !contactList) {
        throw new Error("Nao foi possivel criar a lista de contatos no Disparador.");
      }

      const batchSize = 500;
      for (let index = 0; index < contacts.length; index += batchSize) {
        const batch = contacts.slice(index, index + batchSize).map((contact) => ({
          list_id: contactList.id,
          nome: contact.nome,
          telefone: contact.telefone,
        }));

        const { error } = await client.from("base_contacts").insert(batch);
        if (error) {
          throw new Error("Nao foi possivel salvar os leads descartados importados.");
        }
      }

      const { data: segmentation, error: segmentationError } = await client
        .from("segmentation_lists")
        .insert({ name: segmentationName })
        .select("id")
        .single();

      if (segmentationError || !segmentation) {
        throw new Error("Nao foi possivel criar a segmentacao importada.");
      }

      const { error: sourceError } = await client.from("segmentation_sources").insert({
        segmentation_id: segmentation.id,
        contact_list_id: contactList.id,
      });

      if (sourceError) {
        throw new Error("Nao foi possivel vincular a lista a segmentacao.");
      }

      toast.success(`Segmentacao criada com ${contacts.length} leads descartados desse funil.`);
      navigate("/segmentacao");
    } catch (error: any) {
      toast.error(error?.message || "Nao foi possivel importar os leads descartados do funil.");
    } finally {
      setImportingDiscarded(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/segmentacao/exact-spotter")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Etapas do funil</h2>
              <p className="text-sm text-muted-foreground">
                Funil selecionado: <span className="font-medium text-foreground">{funnelName}</span>
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="mb-6 rounded-lg border border-border bg-secondary/50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Download className="h-4 w-4 text-primary" />
                    Todos os contatos do funil
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cria uma segmentacao com todos os contatos ativos deste funil, sem incluir os leads descartados.
                  </p>
                </div>
                <Button
                  onClick={handleImportAllContactsByFunnel}
                  disabled={importingAllContacts || importingDiscarded || importingStageId !== null}
                  className="gap-2"
                >
                  {importingAllContacts ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Criar lista com todos os contatos
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div ref={discardedCardRef} className="mb-6 rounded-lg border border-border bg-secondary/50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <ArchiveX className="h-4 w-4 text-primary" />
                    Leads descartados do funil
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cria uma segmentacao com todos os leads atualmente marcados como descartados neste funil.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A API do Exact Spotter expõe os descartados no nivel do funil, entao a etapa original do descarte
                    nao vem disponivel para separacao por etapa.
                  </p>
                </div>
                <Button
                  onClick={handleImportDiscardedByFunnel}
                  disabled={importingAllContacts || importingDiscarded || importingStageId !== null}
                  className="gap-2"
                >
                  {importingDiscarded ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Criar com descartados do funil
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ListTree className="h-5 w-5 text-primary" />
              Etapas disponiveis
            </CardTitle>
            <CardDescription>
              Ao selecionar uma etapa, o sistema cria automaticamente a segmentacao com os contatos ativos encontrados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pageError ? (
              <div className="space-y-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">{pageError}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Tentar novamente
                </Button>
              </div>
            ) : stages.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma etapa ativa foi encontrada para esse funil.
              </div>
            ) : (
              <div className="space-y-3">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4"
                  >
                    <div>
                      <div className="font-medium text-sm text-foreground">
                        {stage.position}. {stage.value}
                      </div>
                      <p className="text-xs text-muted-foreground">ID da etapa: {stage.id}</p>
                    </div>
                    <Button
                      onClick={() => handleImportStage(stage)}
                      disabled={importingStageId !== null || importingAllContacts || importingDiscarded}
                      className="gap-2"
                    >
                      {importingStageId === stage.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Criar segmentacao
                        </>
                      )}
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
