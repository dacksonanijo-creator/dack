import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Crown,
  Flame,
  Menu,
  Newspaper,
  Search,
  Shield,
  Trophy,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Futebol360 — O jogo começa aqui" },
      {
        name: "description",
        content:
          "Futebol360 — resultados, jogos, notícias, classificações e os grandes momentos do futebol.",
      },
      { name: "theme-color", content: "#071a13" },
    ],
  }),
  component: FootballHome,
});

const matches = [
  { competition: "Premier League", home: "Arsenal", away: "Chelsea", time: "18:30", homeScore: "—", awayScore: "—", live: false },
  { competition: "La Liga", home: "Barcelona", away: "Atlético Madrid", time: "21:00", homeScore: "—", awayScore: "—", live: false },
  { competition: "Serie A", home: "Inter", away: "Milan", time: "20:45", homeScore: "—", awayScore: "—", live: false },
];

const table = [
  ["1", "Arsenal", "12", "28"],
  ["2", "Barcelona", "12", "26"],
  ["3", "Inter", "12", "25"],
  ["4", "Real Madrid", "12", "24"],
];

function FootballHome() {
  return (
    <main className="min-h-screen bg-[#07110d] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07110d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-[#07110d] shadow-[0_0_35px_rgba(52,211,153,.25)]">
              <Trophy className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight">
              Futebol<span className="text-emerald-400">360</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-white/65 md:flex">
            <a className="text-white" href="#inicio">Início</a>
            <a className="transition hover:text-emerald-300" href="#jogos">Jogos</a>
            <a className="transition hover:text-emerald-300" href="#noticias">Notícias</a>
            <a className="transition hover:text-emerald-300" href="#classificacao">Classificação</a>
          </nav>

          <div className="flex items-center gap-2">
            <button className="hidden h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 md:grid">
              <Search className="h-4 w-4" />
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <section id="inicio" className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(52,211,153,.18),transparent_32%),radial-gradient(circle_at_10%_70%,rgba(16,185,129,.10),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[.18em] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              A paixão não para
            </div>
            <h1 className="max-w-3xl font-display text-5xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-8xl">
              O futebol.
              <br />
              <span className="text-emerald-400">Sem perder</span>
              <br />
              nenhum momento.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
              Jogos, resultados, notícias e classificação num só lugar. Uma experiência feita para quem vive o futebol todos os dias.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#jogos" className="inline-flex h-13 items-center gap-2 rounded-2xl bg-emerald-400 px-6 font-bold text-[#07110d] transition hover:-translate-y-0.5 hover:bg-emerald-300">
                Ver jogos
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#noticias" className="inline-flex h-13 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 font-bold transition hover:bg-white/10">
                Últimas notícias
              </a>
            </div>
          </div>

          <div className="relative flex min-h-[430px] items-end overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-500/20 via-[#10251c] to-[#0b1712] p-6 shadow-2xl">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#07110d] via-transparent to-transparent" />
            <div className="relative w-full">
              <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[.16em] text-emerald-300">
                <span>Jogo em destaque</span>
                <span>Hoje</span>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5 backdrop-blur">
                <p className="text-xs text-white/45">UEFA Champions League</p>
                <div className="mt-5 flex items-center justify-between">
                  <TeamBadge name="Real" mark="R" />
                  <div className="text-center">
                    <p className="font-display text-4xl font-black">20:00</p>
                    <p className="mt-1 text-xs text-white/40">Estádio principal</p>
                  </div>
                  <TeamBadge name="City" mark="C" />
                </div>
                <button className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-[#07110d]">
                  Ver detalhes <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="jogos" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <SectionTitle icon={CalendarDays} eyebrow="Calendário" title="Próximos jogos" action="Ver todos" />
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {matches.map((match) => (
            <article key={match.home} className="group rounded-3xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-white/[.055]">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span className="font-semibold">{match.competition}</span>
                <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {match.time}</span>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <TeamBadge name={match.home} mark={match.home[0]} />
                <span className="text-xl font-black text-white/30">VS</span>
                <TeamBadge name={match.away} mark={match.away[0]} />
              </div>
              <div className="mt-5 border-t border-white/10 pt-4 text-center text-xs text-white/40">Pré-jogo</div>
            </article>
          ))}
        </div>
      </section>

      <section id="noticias" className="border-y border-white/10 bg-[#091812]">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <SectionTitle icon={Newspaper} eyebrow="Em destaque" title="Últimas notícias" action="Todas as notícias" />
          <div className="mt-7 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <article className="group min-h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-900/60 to-[#0b1511] p-7 transition hover:border-emerald-400/30">
              <div className="flex h-full flex-col justify-end">
                <span className="mb-auto w-fit rounded-full bg-emerald-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#07110d]">Mercado</span>
                <h3 className="max-w-2xl font-display text-3xl font-black leading-tight sm:text-4xl">
                  A nova temporada promete grandes duelos e histórias para acompanhar.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
                  Acompanhe as principais movimentações, análises e notícias do mundo do futebol.
                </p>
              </div>
            </article>
            <div className="grid gap-4">
              {[
                ["Champions League", "Os grandes clubes entram novamente em campo."],
                ["Análise", "O que muda para as equipas nesta jornada?"],
                ["Seleções", "As próximas datas internacionais já estão no radar."],
              ].map(([tag, title]) => (
                <article key={tag} className="rounded-3xl border border-white/10 bg-white/[.035] p-5 transition hover:bg-white/[.06]">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300"><Flame className="h-3.5 w-3.5" /> {tag}</div>
                  <h3 className="mt-3 font-display text-lg font-bold leading-snug">{title}</h3>
                  <div className="mt-4 flex items-center justify-between text-xs text-white/35"><span>Hoje</span><ChevronRight className="h-4 w-4" /></div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="classificacao" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_.75fr]">
          <div>
            <SectionTitle icon={Trophy} eyebrow="Tabela" title="Classificação" action="Abrir tabela" />
            <div className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
              <div className="grid grid-cols-[40px_1fr_70px_70px] gap-3 border-b border-white/10 px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white/35">
                <span>#</span><span>Clube</span><span>J</span><span>PTS</span>
              </div>
              {table.map(([pos, club, games, points]) => (
                <div key={club} className="grid grid-cols-[40px_1fr_70px_70px] items-center gap-3 border-b border-white/5 px-5 py-4 text-sm last:border-0">
                  <span className="font-bold text-white/35">{pos}</span>
                  <span className="flex items-center gap-3 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-xs font-black">{club[0]}</span>{club}</span>
                  <span className="text-white/50">{games}</span>
                  <span className="font-black text-emerald-300">{points}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/15 to-white/[.025] p-7">
            <div className="flex h-full flex-col">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400 text-[#07110d]"><Crown className="h-5 w-5" /></span>
              <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Experiência Futebol360</p>
              <h2 className="mt-3 font-display text-3xl font-black">Tudo o que precisas para acompanhar a época.</h2>
              <p className="mt-4 text-sm leading-6 text-white/50">Cria a tua experiência com favoritos, equipas seguidas e alertas dos jogos que realmente importam.</p>
              <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
                <MiniStat icon={Users} value="24/7" label="Atualizações" />
                <MiniStat icon={Shield} value="100%" label="Foco no jogo" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-xs text-white/35 sm:flex-row lg:px-8">
          <span>© 2026 Futebol360. O jogo começa aqui.</span>
          <span>Resultados • Notícias • Jogos • Classificação</span>
        </div>
      </footer>
    </main>
  );
}

function TeamBadge({ name, mark }: { name: string; mark: string }) {
  return (
    <div className="flex w-24 flex-col items-center gap-2 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/10 font-display text-lg font-black">{mark}</span>
      <span className="truncate text-xs font-semibold text-white/75">{name}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, eyebrow, title, action }: { icon: typeof Trophy; eyebrow: string; title: string; action: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300"><Icon className="h-3.5 w-3.5" /> {eyebrow}</div>
        <h2 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
      </div>
      <button className="hidden items-center gap-1 text-xs font-bold text-white/45 transition hover:text-emerald-300 sm:flex">{action}<ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <Icon className="h-4 w-4 text-emerald-300" />
      <p className="mt-3 font-display text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}
