import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package, Truck, Home, AlertTriangle, User, LogOut, Clock, Search } from "lucide-react";
import logo from "@/assets/watts-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rastreie sua moto elétrica | WattsTransportes" },
      {
        name: "description",
        content:
          "Informe seu CPF e acompanhe em tempo real o status da entrega da sua moto elétrica WattsTransportes.",
      },
      { property: "og:title", content: "Rastreie sua moto elétrica | WattsTransportes" },
      {
        property: "og:description",
        content: "Consulte o código de rastreio, prazo e histórico completo da sua entrega.",
      },
    ],
  }),
  component: Index,
});

type Evento = { data: string; hora: string; texto: string; local: string };
type Pedido = {
  nome: string;
  codigo: string;
  previsao: string;
  etapa: 0 | 1 | 2;
  aviso?: string;
  historico: Evento[];
};

const ETAPAS = [
  { icon: Package, label: "Pedido Preparado" },
  { icon: Truck, label: "Em transporte" },
  { icon: Home, label: "Entregue" },
];

const CIDADES = [
  "São José / SC",
  "Joinville / SC",
  "Curitiba / PR",
  "Sorocaba / SP",
  "Campinas / SP",
  "Belo Horizonte / MG",
  "Goiânia / GO",
  "Salvador / BA",
];

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function fmtData(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function addDias(base: Date, dias: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

function diasUteisEntre(inicio: Date, fim: Date) {
  let dias = 0;
  const d = new Date(inicio);
  while (d < fim) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) dias++;
  }
  return dias;
}

function gerarPedido(digits: string): Pedido {
  const h = hash(digits);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Data do pedido: entre 0 e 9 dias atrás (determinístico pelo CPF)
  const diasDesdePedido = h % 10;
  const dataPedido = addDias(hoje, -diasDesdePedido);

  const origem = CIDADES[h % CIDADES.length]!;
  const rota = CIDADES[(h + 3) % CIDADES.length]!;
  const destino = CIDADES[(h + 5) % CIDADES.length]!;

  const eventos: Array<{ dia: number; hora: string; texto: string; local: string }> = [
    { dia: 0, hora: "09:05", texto: "Pedido preparado e embalado", local: origem },
    { dia: 0, hora: "17:30", texto: "Pedido postado no centro de distribuição", local: origem },
    { dia: 2, hora: "08:12", texto: "Objeto em trânsito com a transportadora parceira", local: rota },
    { dia: 4, hora: "14:50", texto: "Objeto em transferência para a filial regional", local: destino },
    { dia: 6, hora: "07:45", texto: "Objeto saiu para entrega", local: destino },
    { dia: 6, hora: "11:20", texto: "Objeto entregue ao destinatário", local: destino },
  ];

  const ocorridos = eventos.filter((ev) => ev.dia <= diasDesdePedido);
  const historico: Evento[] = ocorridos
    .map((ev) => ({
      data: fmtData(addDias(dataPedido, ev.dia)),
      hora: ev.hora,
      texto: ev.texto,
      local: ev.local,
    }))
    .reverse();

  const entregue = diasDesdePedido >= 6;
  const etapa: 0 | 1 | 2 = entregue ? 2 : diasDesdePedido >= 2 ? 1 : 0;

  const dataEntrega = addDias(dataPedido, 6);
  const uteis = Math.max(diasUteisEntre(hoje, dataEntrega), 0);
  const previsao = entregue
    ? "Entregue"
    : uteis <= 1
      ? "Chega hoje ou amanhã"
      : `${uteis} dias úteis (até ${fmtData(dataEntrega)})`;

  const codigo = `WT${(h % 1000000000).toString().padStart(9, "0")}BR`;

  const avisos: Array<string | undefined> = [
    "Sua moto mudou de lote e seguirá com a transportadora parceira RodoSul. O prazo permanece o mesmo.",
    "Rota otimizada para reduzir o tempo de entrega. O prazo permanece o mesmo.",
    undefined,
  ];
  const aviso = entregue ? undefined : avisos[h % avisos.length];

  return {
    nome: `Cliente ${digits.slice(0, 3)}`,
    codigo,
    previsao,
    etapa,
    ...(aviso ? { aviso } : {}),
    historico,
  };
}

function Index() {
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [pedido, setPedido] = useState<Pedido | null>(null);

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) {
      setErro("Digite um CPF válido com 11 dígitos.");
      return;
    }
    setErro("");
    setPedido(gerarPedido(digits));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-5 py-4 sm:px-10">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo WattsTransportes" width={512} height={512} className="h-11 w-11 object-contain" />
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight text-primary">WattsTransportes</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Rastreio de entregas
            </p>
          </div>
        </div>
        {pedido ? (
          <button
            onClick={() => {
              setPedido(null);
              setCpf("");
            }}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-5 w-5" />
          </span>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        {!pedido ? (
          <section className="mt-10 rounded-3xl bg-card p-7 shadow-[0_18px_50px_-24px_rgba(20,40,90,0.45)] sm:p-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
              Acompanhe sua moto elétrica
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Informe o CPF usado na compra para consultar o status da entrega.
            </p>
            <form onSubmit={entrar} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf" className="font-semibold text-primary">
                  CPF
                </Label>
                <Input
                  id="cpf"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  className="h-14 rounded-2xl border-2 text-lg font-semibold tracking-wide"
                />
                {erro && <p className="text-sm font-medium text-destructive">{erro}</p>}
              </div>
              <Button type="submit" className="h-14 w-full rounded-2xl text-base font-bold">
                <Search className="mr-2 h-5 w-5" /> Rastrear pedido
              </Button>
            </form>
          </section>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-3xl bg-card p-6 shadow-[0_18px_50px_-24px_rgba(20,40,90,0.45)] sm:p-8">
              <p className="text-sm font-semibold text-muted-foreground">
                Olá, {pedido.nome}. Este é o seu código de rastreio:
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <p className="rounded-2xl bg-primary px-5 py-4 text-center text-2xl font-extrabold tracking-[0.12em] text-primary-foreground sm:text-3xl">
                  {pedido.codigo}
                </p>
                <span className="inline-flex items-center gap-2 self-start rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
                  <Clock className="h-4 w-4" /> Previsão: {pedido.previsao}
                </span>
              </div>

              <div className="mt-10">
                <div className="relative flex items-start justify-between">
                  <div className="absolute left-[12%] right-[12%] top-7 h-1.5 rounded-full bg-muted" />
                  <div
                    className="absolute left-[12%] top-7 h-1.5 rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${(pedido.etapa / 2) * 76}%` }}
                  />
                  {ETAPAS.map((etapa, i) => {
                    const ativo = i <= pedido.etapa;
                    const Icone = etapa.icon;
                    return (
                      <div key={etapa.label} className="relative z-10 flex w-1/3 flex-col items-center gap-2">
                        <span
                          className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-card transition-colors ${
                            ativo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icone className="h-6 w-6" />
                        </span>
                        <span
                          className={`text-center text-xs font-bold ${
                            ativo ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {etapa.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {pedido.aviso && (
              <section className="flex gap-3 rounded-2xl bg-warning px-5 py-4 text-warning-foreground">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Aviso de atualização</p>
                  <p className="mt-1 text-sm">{pedido.aviso}</p>
                </div>
              </section>
            )}

            <section className="rounded-3xl bg-card p-6 shadow-[0_18px_50px_-24px_rgba(20,40,90,0.45)] sm:p-8">
              <h2 className="text-lg font-extrabold text-primary">Histórico detalhado</h2>
              <ol className="mt-5 space-y-5">
                {pedido.historico.map((ev, i) => (
                  <li key={`${ev.data}-${ev.hora}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`h-3 w-3 rounded-full ${i === 0 ? "bg-accent" : "bg-border"}`}
                      />
                      {i < pedido.historico.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="-mt-1 pb-1">
                      <p className="text-xs font-bold text-muted-foreground">
                        {ev.data} · {ev.hora}
                      </p>
                      <p className="text-sm font-semibold text-foreground">{ev.texto}</p>
                      <p className="text-xs text-muted-foreground">{ev.local}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
