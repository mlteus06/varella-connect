import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createExternalClient, getSupabaseConfig } from "@/lib/supabase-client";
import { AppHeader } from "@/components/AppHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Database, Clock, Loader2 } from "lucide-react";

interface Disparo {
  id: string;
  nome: string | null;
  telefone: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config) {
      navigate("/");
      return;
    }
    fetchDisparos();
  }, [navigate]);

  const fetchDisparos = async () => {
    const client = createExternalClient();
    if (!client) return;

    setLoading(true);
    const { data, error } = await client
      .from("disparos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDisparos(data);
    }
    setLoading(false);
  };

  const totalRegistros = disparos.length;
  const totalPendentes = disparos.filter((d) => d.status === "PENDENTE").length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Painel de Controle</h2>
            <p className="text-sm text-muted-foreground">Visão geral dos disparos registrados.</p>
          </div>
          <Button onClick={() => navigate("/novo")} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cadastro
          </Button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <StatCard label="Total de Registros" value={totalRegistros} icon={Database} />
          <StatCard label="Pendentes" value={totalPendentes} icon={Clock} />
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Registros</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : disparos.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum registro encontrado. Crie o primeiro disparo.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">Telefone</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disparos.map((d) => (
                    <TableRow key={d.id} className="border-border">
                      <TableCell className="font-medium">{d.nome || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{d.telefone}</TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
