import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createExternalClient, getSupabaseConfig, loadConfigFromCloud } from "@/lib/supabase-client";
import { AppHeader } from "@/components/AppHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Database, Clock, CheckCircle, Loader2, CalendarIcon, MessageCircle, Percent } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface Disparo {
  id: string;
  nome: string | null;
  telefone: string;
  mensagem: string | null;
  status: string;
  created_at: string;
  respondeu?: boolean | null;
}

type FilterKey = "today" | "yesterday" | "7d" | "15d" | "30d" | "custom";

const FILTER_LABELS: Record<FilterKey, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7d": "7 dias",
  "15d": "15 dias",
  "30d": "30 dias",
  custom: "Personalizado",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  useEffect(() => {
    const init = async () => {
      let config = getSupabaseConfig();
      if (!config) {
        config = await loadConfigFromCloud();
      }
      if (!config) {
        navigate("/onboarding");
        return;
      }
      fetchDisparos();
    };
    init();
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

  const getDateRange = (filter: FilterKey): { start: Date; end: Date } | null => {
    const now = new Date();
    switch (filter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday": {
        const y = subDays(now, 1);
        return { start: startOfDay(y), end: endOfDay(y) };
      }
      case "7d":
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case "15d":
        return { start: startOfDay(subDays(now, 14)), end: endOfDay(now) };
      case "30d":
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case "custom":
        if (customRange?.from) {
          return {
            start: startOfDay(customRange.from),
            end: endOfDay(customRange.to || customRange.from),
          };
        }
        return null;
      default:
        return null;
    }
  };

  const filteredDisparos = useMemo(() => {
    const range = getDateRange(activeFilter);
    if (!range) return disparos;
    return disparos.filter((d) => {
      const date = new Date(d.created_at);
      return isWithinInterval(date, { start: range.start, end: range.end });
    });
  }, [disparos, activeFilter, customRange]);

  const totalRegistros = filteredDisparos.length;
  const totalPendentes = filteredDisparos.filter((d) => d.status === "PENDENTE").length;
  const totalEnviados = filteredDisparos.filter((d) => d.status === "ENVIADO").length;
  const totalResponderam = filteredDisparos.filter((d) => d.respondeu === true).length;
  const taxaResposta = totalEnviados > 0 ? Math.round((totalResponderam / totalEnviados) * 100) : 0;

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

        {/* Date Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => {
            if (key === "custom") return null;
            return (
              <Button
                key={key}
                variant={activeFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(key)}
              >
                {FILTER_LABELS[key]}
              </Button>
            );
          })}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={activeFilter === "custom" ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {activeFilter === "custom" && customRange?.from
                  ? `${format(customRange.from, "dd/MM", { locale: ptBR })} - ${format(customRange.to || customRange.from, "dd/MM", { locale: ptBR })}`
                  : "Personalizado"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={(range) => {
                  setCustomRange(range);
                  setActiveFilter("custom");
                }}
                numberOfMonths={1}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total de Registros" value={totalRegistros} icon={Database} />
          <StatCard label="Pendentes" value={totalPendentes} icon={Clock} />
          <StatCard label="Enviados" value={totalEnviados} icon={CheckCircle} />
          <StatCard label="Responderam" value={totalResponderam} icon={MessageCircle} />
          <StatCard label="Taxa de Resposta" value={`${taxaResposta}%`} icon={Percent} />
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
            ) : filteredDisparos.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum registro encontrado para o período selecionado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">Telefone</TableHead>
                    <TableHead className="text-muted-foreground">Mensagem</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Respondeu</TableHead>
                    <TableHead className="text-muted-foreground text-right">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisparos.map((d) => (
                    <TableRow key={d.id} className="border-border">
                      <TableCell className="font-medium">{d.nome || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{d.telefone}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{d.mensagem || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} />
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          d.respondeu
                            ? "bg-green-500/10 text-green-500"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {d.respondeu ? "Sim" : "Não"}
                        </span>
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
