// Gera o "compilador de contribuições": o quadro de contribuições em 0 e 1,
// com uma linha de compilação passando por ele.
// Uso no GitHub Actions: node scripts/code-graph.mjs  (precisa de GITHUB_TOKEN e GH_USER; REPOS opcional)
// Teste local sem token: node scripts/code-graph.mjs --teste
//
// GitLab (opcional): soma a atividade do GitLab na grade e no total.
//   - Online (Actions): defina GITLAB_URL, GITLAB_USER e, se o perfil não for público, GITLAB_TOKEN (scope read_api).
//   - Offline (GitLab só na rede interna): rode na sua máquina
//       GITLAB_URL=https://gitlab.suaempresa.com.br GITLAB_USER=voce GITLAB_TOKEN=xxx node scripts/code-graph.mjs --exportar-gitlab
//     e faça commit do arquivo data/gitlab-calendar.json (só datas e quantidades, nenhum código).
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";

const GITLAB_FILE = "data/gitlab-calendar.json";

const THEMES = {
  dark: {
    bg: "#0d1117", panel: "#161b22", border: "#30363d", text: "#c9d1d9", muted: "#8b949e",
    zero: "#21262d", levels: ["#21262d", "#0e4429", "#006d32", "#26a641", "#39d353"],
    accent: "#39d353", blue: "#58a6ff", purple: "#d2a8ff", orange: "#ffa657", flash: "#ffffff",
  },
  light: {
    bg: "#ffffff", panel: "#f6f8fa", border: "#d0d7de", text: "#24292f", muted: "#57606a",
    zero: "#d0d7de", levels: ["#d0d7de", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
    accent: "#1a7f37", blue: "#0969da", purple: "#8250df", orange: "#bc4c00", flash: "#0d1117",
  },
};
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function render(weeks, total, user, t, origem = "") {
  const CELL = 15, X0 = 58, Y0 = 92, nW = weeks.length;
  const W = X0 + nW * CELL + 30, H = Y0 + 7 * CELL + 78;
  const barW = gridR0() - 34 - 190;
  function gridR0(){ return X0 + nW * CELL; }
  const SCAN = 9; // segundos de uma passada
  const step = SCAN / nW;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let cells = "", months = "", lastMonth = -1;

  weeks.forEach((w, i) => {
    const first = w.contributionDays[0];
    const m = new Date(first.date + "T00:00:00Z").getUTCMonth();
    if (m !== lastMonth && i < nW - 2) {
      months += `<text x="${X0 + i * CELL}" y="${Y0 - 14}" class="m">${MESES[m]}</text>`;
      lastMonth = m;
    }
    w.contributionDays.forEach((d) => {
      const lv = LEVEL[d.contributionLevel] ?? (d.contributionCount > 0 ? 2 : 0);
      const x = X0 + i * CELL + CELL / 2, y = Y0 + d.weekday * CELL + 11;
      const delay = (i * step).toFixed(2);
      if (lv === 0) {
        cells += `<text x="${x}" y="${y}" class="z" style="animation-delay:${delay}s">0</text>`;
      } else {
        cells += `<text x="${x}" y="${y}" class="c" fill="${t.levels[lv]}" style="animation-delay:${delay}s">1</text>`;
      }
    });
  });

  const gridR = X0 + nW * CELL;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
text{font-family:'JetBrains Mono','Fira Code',Consolas,'Courier New',monospace}
.m{font-size:11px;fill:${t.muted}}
.d{font-size:11px;fill:${t.muted}}
.z,.c{font-size:12px;text-anchor:middle;font-weight:700}
.z{fill:${t.zero};animation:z ${SCAN}s linear infinite}
.c{animation:c ${SCAN}s linear infinite}
@keyframes z{0%{fill:${t.muted}}4%{fill:${t.zero}}100%{fill:${t.zero}}}
@keyframes c{0%{fill:${t.flash}}6%{fill:${t.accent}}100%{}}
.scan{animation:scan ${SCAN}s linear infinite}
@keyframes scan{from{transform:translateX(0)}to{transform:translateX(${nW * CELL}px)}}
.prog{transform-box:fill-box;transform-origin:left;animation:prog ${SCAN}s linear infinite}
@keyframes prog{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.a{animation:a ${SCAN}s steps(1) infinite}.b{opacity:0;animation:b ${SCAN}s steps(1) infinite}
@keyframes a{0%{opacity:1}92%{opacity:0}100%{opacity:0}}
@keyframes b{0%{opacity:0}92%{opacity:1}100%{opacity:1}}
.cur{animation:bl 1s steps(1) infinite}@keyframes bl{50%{opacity:0}}
</style>
<defs>
<linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="0"/><stop offset=".85" stop-color="${t.accent}" stop-opacity=".25"/><stop offset="1" stop-color="${t.accent}" stop-opacity=".9"/></linearGradient>
<clipPath id="cl"><rect x="${X0 - 4}" y="${Y0 - 4}" width="${nW * CELL + 8}" height="${7 * CELL + 8}"/></clipPath>
</defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="${t.bg}" stroke="${t.border}" stroke-width="2"/>
<path d="M1 13 a12 12 0 0 1 12 -12 H${W - 13} a12 12 0 0 1 12 12 V40 H1Z" fill="${t.panel}"/>
<rect x="1" y="40" width="${W - 2}" height="1" fill="${t.border}"/>
<circle cx="22" cy="21" r="6" fill="#ff5f57"/><circle cx="40" cy="21" r="6" fill="#febc2e"/><circle cx="58" cy="21" r="6" fill="#28c840"/>
<text x="${W / 2}" y="26" text-anchor="middle" style="font-size:13px;fill:${t.muted}">contribuicoes.bin — compilando @${esc(user)}</text>
<text x="22" y="66" style="font-size:13px"><tspan fill="${t.accent}">$</tspan><tspan fill="${t.text}"> git log --since="1 ano" </tspan><tspan fill="${t.muted}">| </tspan><tspan fill="${t.purple}">compilar</tspan><tspan fill="${t.orange}"> --binario</tspan></text>
${months}
<text x="${X0 - 12}" y="${Y0 + 1 * CELL + 11}" class="d" text-anchor="end">seg</text>
<text x="${X0 - 12}" y="${Y0 + 3 * CELL + 11}" class="d" text-anchor="end">qua</text>
<text x="${X0 - 12}" y="${Y0 + 5 * CELL + 11}" class="d" text-anchor="end">sex</text>
${cells}
<g clip-path="url(#cl)"><g>
  <animateTransform attributeName="transform" type="translate" from="0 0" to="${nW * CELL} 0" dur="${SCAN}s" repeatCount="indefinite"/>
  <rect x="${X0 - 70}" y="${Y0 - 4}" width="70" height="${7 * CELL + 8}" fill="url(#g)"/>
  <rect x="${X0 - 2}" y="${Y0 - 4}" width="2" height="${7 * CELL + 8}" fill="${t.accent}"/>
</g></g>
<g style="font-size:13px">
  <text x="22" y="${H - 44}"><tspan fill="${t.muted}">[</tspan></text>
  <rect x="34" y="${H - 54}" width="${barW}" height="12" rx="2" fill="${t.panel}"/>
  <rect x="34" y="${H - 54}" width="0" height="12" rx="2" fill="${t.accent}"><animate attributeName="width" from="0" to="${barW}" dur="${SCAN}s" repeatCount="indefinite"/></rect>
  <text x="${34 + barW + 6}" y="${H - 44}"><tspan fill="${t.muted}">]</tspan></text>
  <text class="a" x="${34 + barW + 22}" y="${H - 44}" fill="${t.orange}">compilando...</text>
  <text class="b" x="${34 + barW + 22}" y="${H - 44}" fill="${t.accent}">✔ build ok</text>
  <text x="22" y="${H - 18}"><tspan fill="${t.accent}">✔</tspan><tspan fill="${t.text}"> ${total} contribuições compiladas</tspan><tspan fill="${t.muted}">${origem ? ` · ${esc(origem)}` : " · 0 erros · 0 warnings"}</tspan></text>
  <rect class="cur" x="${gridR - 8}" y="${H - 30}" width="8" height="15" fill="${t.text}"/>
</g>
</svg>`;
}


// ---------------- CARTÕES (estatísticas, linguagens, projetos) ----------------
function frame(W, H, title, t) {
  return `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="${t.bg}" stroke="${t.border}" stroke-width="2"/>
<path d="M1 13 a12 12 0 0 1 12 -12 H${W - 13} a12 12 0 0 1 12 12 V38 H1Z" fill="${t.panel}"/>
<rect x="1" y="38" width="${W - 2}" height="1" fill="${t.border}"/>
<circle cx="20" cy="20" r="5.5" fill="#ff5f57"/><circle cx="37" cy="20" r="5.5" fill="#febc2e"/><circle cx="54" cy="20" r="5.5" fill="#28c840"/>
<text x="${W / 2}" y="25" text-anchor="middle" style="font-size:12.5px;fill:${t.muted}">${title}</text>`;
}
const CSS = (t) => `<style>text{font-family:'JetBrains Mono','Fira Code',Consolas,'Courier New',monospace}
.l{opacity:0;animation:l .4s ease-out forwards}@keyframes l{to{opacity:1}}</style>`;
const esc2 = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function statsCard(st, t) {
  const W = 440, H = 220;
  const rows = [
    ["commits", st.commits, t.accent], ["pull_requests", st.prs, t.blue], ["issues", st.issues, t.purple],
    ["repositorios", st.repos, t.orange], ["estrelas", st.stars, "#e3b341"], ["seguidores", st.followers, t.blue],
  ];
  let body = `<text x="20" y="64" class="l" style="font-size:13px"><tspan fill="${t.accent}">$</tspan><tspan fill="${t.text}"> git stats </tspan><tspan fill="${t.orange}">--ultimo-ano</tspan></text>`;
  rows.forEach(([k, v, c], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 20 + col * 210, y = 104 + row * 38;
    body += `<g class="l" style="animation-delay:${0.15 + i * 0.12}s">
<text x="${x}" y="${y}" style="font-size:12px;fill:${t.muted}">${k}:</text>
<text x="${x + 190}" y="${y}" text-anchor="end" style="font-size:18px;font-weight:700;fill:${c}">${v}</text>
<rect x="${x}" y="${y + 9}" width="190" height="1" fill="${t.border}"/></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS(t)}${frame(W, H, "stats.sh", t)}${body}</svg>`;
}

export function langsCard(langs, t) {
  const W = 440, H = 220;
  const top = langs.slice(0, 6), total = top.reduce((a, b) => a + b.size, 0) || 1;
  let x = 20, bar = "";
  const BW = 400;
  top.forEach((l, i) => {
    const w = Math.max(3, (l.size / total) * BW);
    bar += `<rect x="${x.toFixed(1)}" y="78" width="${w.toFixed(1)}" height="10" fill="${l.color || t.muted}"/>`;
    x += w;
  });
  let legend = "";
  top.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const lx = 20 + col * 210, ly = 122 + row * 30;
    legend += `<g class="l" style="animation-delay:${0.15 + i * 0.1}s"><circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${l.color || t.muted}"/>
<text x="${lx + 18}" y="${ly}" style="font-size:12.5px;fill:${t.text}">${esc2(l.name)}</text>
<text x="${lx + 190}" y="${ly}" text-anchor="end" style="font-size:12.5px;fill:${t.muted}">${((l.size / total) * 100).toFixed(1)}%</text></g>`;
  });
  if (!top.length) legend = `<text x="20" y="130" style="font-size:13px;fill:${t.muted}">// nenhuma linguagem encontrada ainda</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS(t)}${frame(W, H, "linguagens.json", t)}
<text x="20" y="62" class="l" style="font-size:13px"><tspan fill="${t.accent}">$</tspan><tspan fill="${t.text}"> linguist </tspan><tspan fill="${t.orange}">--top 6</tspan></text>
<clipPath id="bc"><rect x="20" y="78" width="${BW}" height="10" rx="5"/></clipPath><g clip-path="url(#bc)">${bar}</g>${legend}</svg>`;
}

function wrap(text, max) {
  const words = text.split(/\s+/); const lines = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > max) { lines.push(cur.trim()); cur = w; } else cur += " " + w; }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, 2).map((l, i, a) => (i === 1 && lines.length > 2 ? l.slice(0, max - 1) + "…" : l));
}
export function repoCard(r, t) {
  const W = 440, H = 150;
  const desc = wrap(r.description || "// adicione uma descrição a este repositório", 52);
  const lang = r.primaryLanguage;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${CSS(t)}${frame(W, H, "~/projetos", t)}
<text x="20" y="66" style="font-size:15px;font-weight:700" xml:space="preserve"><tspan fill="${t.muted}">./</tspan><tspan fill="${t.accent}">${esc2(r.name)}</tspan>${r.isFork ? `<tspan fill="${t.muted}" style="font-size:11.5px;font-weight:400">  ⑂ ${esc2(((x) => x.length > 44 - r.name.length ? x.slice(0, Math.max(4, 43 - r.name.length)) + "…" : x)(r.parent?.nameWithOwner || "fork"))}</tspan>` : ""}</text>
${desc.map((d, i) => `<text x="20" y="${92 + i * 18}" style="font-size:12px;fill:${r.description ? t.text : t.muted}">${esc2(d)}</text>`).join("")}
${lang ? `<circle cx="25" cy="${H - 20}" r="5" fill="${lang.color || t.muted}"/><text x="36" y="${H - 16}" style="font-size:12px;fill:${t.muted}">${esc2(lang.name)}</text>` : ""}
<text x="${W - 20}" y="${H - 16}" text-anchor="end" style="font-size:12px;fill:${t.muted}">★ ${r.stargazerCount}   ⑂ ${r.forkCount}</text>
</svg>`;
}

// ---------------- GITLAB ----------------
const dia = (d) => new Date(d).toLocaleDateString("sv-SE", { timeZone: process.env.TZ_PERFIL || "America/Sao_Paulo" });

export async function fetchGitlab({ url, user, token, desde }) {
  const base = url.replace(/\/+$/, "");
  const cal = {};
  if (token) {
    // API de eventos: conta cada evento (push, MR, issue, comentário), como o calendário do GitLab
    for (let page = 1; page <= 100; page++) {
      const r = await fetch(`${base}/api/v4/users/${encodeURIComponent(user)}/events?after=${desde}&per_page=100&page=${page}`,
        { headers: { "PRIVATE-TOKEN": token } });
      if (!r.ok) throw new Error(`GitLab API ${r.status}: ${await r.text()}`);
      const evs = await r.json();
      for (const e of evs) { const k = dia(e.created_at); cal[k] = (cal[k] || 0) + 1; }
      if (evs.length < 100) break;
    }
  } else {
    // calendário público do perfil
    const r = await fetch(`${base}/users/${encodeURIComponent(user)}/calendar.json`);
    if (!r.ok) throw new Error(`GitLab calendar ${r.status}`);
    Object.assign(cal, await r.json());
  }
  return cal;
}

async function gitlabCalendar(desde) {
  const { GITLAB_URL: url, GITLAB_USER: user, GITLAB_TOKEN: token } = process.env;
  if (url && user) {
    try { return await fetchGitlab({ url, user, token, desde }); }
    catch (e) { console.warn(`Aviso: GitLab online indisponível (${e.message}); tentando ${GITLAB_FILE}`); }
  }
  if (existsSync(GITLAB_FILE)) return JSON.parse(readFileSync(GITLAB_FILE, "utf8")).calendario || {};
  return null;
}

function mesclar(weeks, extra) {
  const all = weeks.flatMap((w) => w.contributionDays);
  for (const d of all) d.contributionCount += extra[d.date] || 0;
  const nz = all.map((d) => d.contributionCount).filter((c) => c > 0).sort((a, b) => a - b);
  const q = (p) => nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  for (const d of all) {
    const c = d.contributionCount;
    d.contributionLevel = c === 0 ? "NONE" : c <= q1 ? "FIRST_QUARTILE" : c <= q2 ? "SECOND_QUARTILE" : c <= q3 ? "THIRD_QUARTILE" : "FOURTH_QUARTILE";
  }
  const datas = new Set(all.map((d) => d.date));
  return Object.entries(extra).reduce((a, [k, v]) => a + (datas.has(k) ? v : 0), 0);
}

async function main() {
  const user = process.env.GH_USER, token = process.env.GITHUB_TOKEN;
  const wanted = (process.env.REPOS || "").split(",").map((x) => x.trim()).filter(Boolean);
  const query = `query($login:String!){user(login:$login){
    followers{totalCount}
    contributionsCollection{
      totalCommitContributions totalPullRequestContributions totalIssueContributions restrictedContributionsCount
      contributionCalendar{totalContributions weeks{contributionDays{date weekday contributionCount contributionLevel}}}}
    repositories(first:100, ownerAffiliations:OWNER, privacy:PUBLIC, orderBy:{field:PUSHED_AT,direction:DESC}){
      totalCount
      nodes{name description stargazerCount forkCount isFork parent{nameWithOwner} primaryLanguage{name color}
        languages(first:10, orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}}}}}}`;
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: user } }),
  });
  const j = await r.json();
  if (!j.data?.user) throw new Error("Falha ao buscar dados: " + JSON.stringify(j));
  const u = j.data.user, cc = u.contributionsCollection, cal = cc.contributionCalendar, repos = u.repositories.nodes;

  const primeiroDia = cal.weeks[0].contributionDays[0].date;
  const gl = await gitlabCalendar(primeiroDia);
  let total = cal.totalContributions, origem = "";
  if (gl) {
    const glTotal = mesclar(cal.weeks, gl);
    origem = `github ${total} + gitlab ${glTotal}`;
    total += glTotal;
  }

  const langMap = {};
  const own = repos.filter((x) => !x.isFork);
  for (const rp of (own.length ? own : repos)) for (const e of rp.languages.edges) {
    langMap[e.node.name] ??= { name: e.node.name, color: e.node.color, size: 0 };
    langMap[e.node.name].size += e.size;
  }
  const langs = Object.values(langMap).sort((a, b) => b.size - a.size);
  const stats = {
    year: new Date().getFullYear(),
    commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
    prs: cc.totalPullRequestContributions, issues: cc.totalIssueContributions,
    repos: own.length, stars: own.reduce((a, b) => a + b.stargazerCount, 0),
    followers: u.followers.totalCount,
  };
  const chosen = wanted.length ? wanted.map((n) => repos.find((x) => x.name === n)).filter(Boolean) : own.slice(0, 4);

  mkdirSync("dist", { recursive: true });
  for (const [suf, t] of [["", THEMES.light], ["-dark", THEMES.dark]]) {
    writeFileSync(`dist/code-contribution-graph${suf}.svg`, render(cal.weeks, total, user, t, origem));
    writeFileSync(`dist/stats${suf}.svg`, statsCard(stats, t));
    writeFileSync(`dist/langs${suf}.svg`, langsCard(langs, t));
    chosen.forEach((rp, i) => writeFileSync(`dist/repo-${i + 1}${suf}.svg`, repoCard(rp, t)));
  }
  console.log(`OK: ${total} contribuições (${origem || "só GitHub"}), ${chosen.length} projetos, ${langs.length} linguagens`);
}

if (process.argv[2] === "--exportar-gitlab") {
  const { GITLAB_URL: url, GITLAB_USER: user, GITLAB_TOKEN: token } = process.env;
  if (!url || !user) { console.error("Defina GITLAB_URL e GITLAB_USER (e GITLAB_TOKEN se o perfil não for público)."); process.exit(1); }
  const desde = new Date(Date.now() - 372 * 864e5).toISOString().slice(0, 10);
  fetchGitlab({ url, user, token, desde }).then((cal) => {
    mkdirSync("data", { recursive: true });
    writeFileSync(GITLAB_FILE, JSON.stringify({ origem: "gitlab", atualizado: new Date().toISOString(), calendario: cal }, null, 1));
    const n = Object.values(cal).reduce((a, b) => a + b, 0);
    console.log(`OK: ${n} contribuições do GitLab desde ${desde} salvas em ${GITLAB_FILE}. Agora faça commit e push desse arquivo.`);
  }).catch((e) => { console.error(e.message); process.exit(1); });
} else if (process.argv[2] === "--teste") {
  // dados falsos só para pré-visualizar
  const weeks = []; const start = Date.UTC(2025, 10, 16);
  const lv = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start + (w * 7 + d) * 864e5).toISOString().slice(0, 10);
      const r = Math.random(); const L = r < 0.7 ? 0 : 1 + Math.floor(Math.random() * 4);
      days.push({ date, weekday: d, contributionCount: L, contributionLevel: lv[L] });
    }
    weeks.push({ contributionDays: days });
  }
  mkdirSync("dist", { recursive: true });
  writeFileSync("dist/teste-dark.svg", render(weeks, 128, "diegoprass", THEMES.dark));
  writeFileSync("dist/teste-light.svg", render(weeks, 128, "diegoprass", THEMES.light));
  const T = THEMES.dark;
  writeFileSync("dist/t-stats.svg", statsCard({ year: 2026, commits: 42, prs: 3, issues: 1, repos: 3, stars: 2, followers: 15 }, T));
  writeFileSync("dist/t-langs.svg", langsCard([{ name: "Java", color: "#b07219", size: 50 }, { name: "Groovy", color: "#4298b8", size: 30 }, { name: "JavaScript", color: "#f1e05a", size: 12 }, { name: "HTML", color: "#e34c26", size: 8 }, { name: "CSS", color: "#563d7c", size: 5 }], T));
  writeFileSync("dist/t-repo.svg", repoCard({ name: "Ia-coding-toolkit", description: "A curated, battle-tested AI-coding toolkit: Claude Code plugins, subagent orchestration, quality gates.", stargazerCount: 0, forkCount: 0, isFork: true, parent: { nameWithOwner: "autor/Ia-coding-toolkit" }, primaryLanguage: null }, T));
} else {
  main().catch((e) => { console.error(e); process.exit(1); });
}
