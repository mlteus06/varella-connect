import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, ListTree, Download } from "lucide-react";
import { createExternalClient, getExactTokenFromCloud, getSupabaseConfig } from "@/lib/supabase-client";
import {
  ExactStage,
  buildExactSegmentationName,
  fetchExactContactsByStage,
  fetchExactStages,
} from "@/lib/exact-spotter";
import { toast } from "sonner";

interface LocationState {
  funnelName?: string;
}

export default function ExactSpotterStages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { funnelId } = useParams<{ funnelId: string }>();
  const [stages, setStages] = useState<ExactStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingStageId, setImportingStageId] = useState<number | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);

  const funnelName = (location.state as LocationState | null)?.funnelName ?? "Funil";
  const parsedFunnelId = useMemo(() => Number(funnelId), [funnelId]);

  useEffect(() => {
    const init = async () => {
      if (!getSupabaseConfig()) {
        navigate("/onboarding");
        return;
      }

      if (!funnelId || Number.isNaN(parsedFunnelId)) {
        navigate("/segmentacao/exact-spotter");
        return;
      }

      const externalClient = createExternalClient();
      if (!externalClient) {
        navigate("/onboarding");
        return;
      }

      const tokenExact = await getExactTokenFromCloud();
      if (!tokenExact) {
        toast.error("Salve o token do Exact Spotter antes de importar.");
        navigate("/integracoes");
        return;
      }

      setClient(externalClient);

      try {
        const data = await fetchExactStages(tokenExact, parsedFunnelId);
        setStages(data);
      } catch (error: any) {
        toast.error(error?.message || "Não foi possível carregar as etapas do funil.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [funnelId, navigate, parsedFunnelId]);

  const handleImportStage = async (stage: ExactStage) => {
    if (!client) return;

    const tokenExact = await getExactTokenFromCloud();
    if (!tokenExact) {
      toast.error("Token do Exact Spotter não encontrado.");
      navigate("/integracoes");
      return;
    }

    setImportingStageId(stage.id);

    try {
      const contacts = await fetchExactContactsByStage(tokenExact, parsedFunnelId, stage.value);
      if (contacts.length === 0) {
        toast.error("Essa etapa não retornou contatos com telefone.");
        return;
      }

      const segmentationName = buildExactSegmentationName(funnelName, stage.value);

      const { data: contactList, error: contactListError } = await client
        .from("contact_lists")
        .insert({ name: segmentationName, type: "exact_spotter" })
        .select("id")
        .single();

      if (contactListError || !contactList) {
        throw new Error("Não foi possível criar a lista de contatos no Disparador.");
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
          throw new Error("Não foi possível salvar os contatos importados.");
        }
      }

      const { data: segmentation, error: segmentationError } = await client
        .from("segmentation_lists")
        .insert({ name: segmentationName })
        .select("id")
        .single();

      if (segmentationError || !segmentation) {
        throw new Error("Não foi possível criar a segmentação importada.");
      }

      const { error: sourceError } = await client.from("segmentation_sources").insert({
        segmentation_id: segmentation.id,
        contact_list_id: contactList.id,
      });

      if (sourceError) {
        throw new Error("Não foi possível vincular a lista à segmentação.");
      }

      toast.success(`Segmentação criada com ${contacts.length} contatos.`);
      navigate("/segmentacao");
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível importar os contatos da etapa.");
    } finally {
      setImportingStageId(null);
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ListTree className="h-5 w-5 text-primary" />
              Etapas disponíveis
            </CardTitle>
            <CardDescription>
              Ao selecionar uma etapa, o sistema cria automaticamente a segmentação com os contatos encontrados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                      <div className="font-medium text-sm text-foreground">{stage.position}. {stage.value}</div>
                      <p className="text-xs text-muted-foreground">ID da etapa: {stage.id}</p>
                    </div>
                    <Button
                      onClick={() => handleImportStage(stage)}
                      disabled={importingStageId !== null}
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
                          Criar segmentação
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
