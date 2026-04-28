import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, ArchiveX, Download } from "lucide-react";
import { createExternalClient, getExactTokenFromCloud, getSupabaseConfig } from "@/lib/supabase-client";
import {
  buildExactDiscardedSegmentationName,
  fetchExactDiscardedContacts,
} from "@/lib/exact-spotter";
import { toast } from "sonner";

export default function ExactSpotterDiscarded() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [importing, setImporting] = useState(false);

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
      } catch (error: any) {
        const message = error?.message || "Nao foi possivel preparar a importacao dos descartados.";
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
  }, [navigate]);

  const handleImportDiscarded = async () => {
    if (!client) return;

    const tokenExact = await getExactTokenFromCloud();
    if (!tokenExact) {
      toast.error("Token do Exact Spotter nao encontrado.");
      navigate("/integracoes");
      return;
    }

    setImporting(true);

    try {
      const contacts = await fetchExactDiscardedContacts(tokenExact);
      if (contacts.length === 0) {
        toast.error("Nao encontramos leads descartados com telefone nessa conta.");
        return;
      }

      const segmentationName = buildExactDiscardedSegmentationName();

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

      toast.success(`Segmentacao criada com ${contacts.length} leads descartados.`);
      navigate("/segmentacao");
    } catch (error: any) {
      toast.error(error?.message || "Nao foi possivel importar os leads descartados.");
    } finally {
      setImporting(false);
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
              <h2 className="text-2xl font-bold text-foreground">Leads descartados</h2>
              <p className="text-sm text-muted-foreground">
                Importe todos os leads que hoje estao na lista de descartados do Exact Spotter.
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-card border-border max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ArchiveX className="h-5 w-5 text-primary" />
              Importar descartados
            </CardTitle>
            <CardDescription>
              Essa opcao cria uma segmentacao unica com todos os leads da conta que estiverem marcados como
              descartados.
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
            ) : (
              <div className="space-y-5">
                <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                  O nome da segmentacao sera criado automaticamente no formato
                  {" "}
                  <span className="font-medium text-foreground">Exact Spotter - Leads descartados - DATA</span>.
                </div>
                <Button onClick={handleImportDiscarded} disabled={importing} className="gap-2">
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Criar segmentacao com descartados
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
