const EXACT_API_BASE_URL = "https://api.exactspotter.com/v3";
const EXACT_PAGE_SIZE = 500;
const EXACT_REQUEST_TIMEOUT_MS = 20000;

export interface ExactFunnel {
  id: number;
  value: string;
  active: boolean;
}

export interface ExactStage {
  id: number;
  value: string;
  active: boolean;
  position: number;
  funnelId: number;
  gateType: number | null;
}

export interface ExactLeadPerson {
  id: number;
  name: string | null;
  phone1: string | null;
  phone2: string | null;
  mainContact: boolean | null;
}

export interface ExactLead {
  id: number;
  lead: string;
  stage: string | null;
  funnelId: number;
  phone1: string | null;
  phone2: string | null;
  persons: ExactLeadPerson[];
}

export interface ExactImportedContact {
  nome: string | null;
  telefone: string;
}

interface ODataResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
}

function buildHeaders(tokenExact: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    token_exact: tokenExact,
  };
}

async function fetchExact<T>(url: string, tokenExact: string): Promise<ODataResponse<T>> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), EXACT_REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(tokenExact),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("A consulta ao Exact Spotter demorou demais para responder.");
    }

    throw new Error("Nao foi possivel se conectar ao Exact Spotter.");
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Erro ao consultar Exact Spotter.");
  }

  return response.json() as Promise<ODataResponse<T>>;
}

async function fetchAllPages<T>(path: string, tokenExact: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | undefined = `${EXACT_API_BASE_URL}${path}`;
  const visitedUrls = new Set<string>();

  while (nextUrl) {
    if (visitedUrls.has(nextUrl)) {
      throw new Error("A paginacao do Exact Spotter retornou um loop inesperado.");
    }

    visitedUrls.add(nextUrl);
    const payload = await fetchExact<T>(nextUrl, tokenExact);
    items.push(...payload.value);
    nextUrl = payload["@odata.nextLink"];
  }

  return items;
}

function quoteODataString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export async function fetchExactFunnels(tokenExact: string): Promise<ExactFunnel[]> {
  const funnels = await fetchAllPages<ExactFunnel>("/Funnels", tokenExact);
  return funnels
    .filter((funnel) => funnel.active)
    .sort((left, right) => left.value.localeCompare(right.value, "pt-BR"));
}

export async function fetchExactStages(tokenExact: string, funnelId: number): Promise<ExactStage[]> {
  const filter = encodeURIComponent(`funnelId eq ${funnelId}`);
  const orderBy = encodeURIComponent("position asc");
  const stages = await fetchAllPages<ExactStage>(
    `/stages?$filter=${filter}&$orderby=${orderBy}`,
    tokenExact
  );

  return stages
    .filter((stage) => stage.active && stage.funnelId === funnelId)
    .sort((left, right) => left.position - right.position);
}

export async function fetchExactContactsByStage(
  tokenExact: string,
  funnelId: number,
  stageName: string
): Promise<ExactImportedContact[]> {
  const filter = encodeURIComponent(`funnelId eq ${funnelId} and stage eq ${quoteODataString(stageName)}`);
  const select = encodeURIComponent("id,lead,stage,funnelId,phone1,phone2,persons");
  const leads = await fetchAllPages<ExactLead>(
    `/LeadsAndPersons?$filter=${filter}&$select=${select}&$top=${EXACT_PAGE_SIZE}`,
    tokenExact
  );

  const uniqueContacts = new Map<string, ExactImportedContact>();

  leads.forEach((lead) => {
    const mainPerson = lead.persons.find((person) => person.mainContact) ?? lead.persons[0];
    const telefone =
      mainPerson?.phone1?.trim() ||
      mainPerson?.phone2?.trim() ||
      lead.phone1?.trim() ||
      lead.phone2?.trim();

    if (!telefone) return;

    const nome = mainPerson?.name?.trim() || lead.lead?.trim() || null;

    if (!uniqueContacts.has(telefone)) {
      uniqueContacts.set(telefone, { nome, telefone });
    }
  });

  return Array.from(uniqueContacts.values());
}

export function buildExactSegmentationName(funnelName: string, stageName: string, date = new Date()) {
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  return `Exact Spotter - ${funnelName} - ${stageName} - ${formattedDate}`;
}
