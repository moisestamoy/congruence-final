// Congruence · conector propio para Claude y Grok (servidor MCP, transporte HTTP "streamable", respuestas JSON).
// URL: https://vbtshztpqlliytgbdjzm.supabase.co/functions/v1/congruence-mcp  ·  clave en el encabezado x-api-key
// Grok (xAI) no deja mandar encabezados: usa …/congruence-mcp/g/<clave de Grok>, una clave aparte (Vault
// mcp_congruence_grok_token) que se corta sola sin tocar la de Claude: ./herramientas/clave_conector.sh grok [rotar]
// Las claves se validan contra el Vault (supabase/mcp-congruence.sql). Todo es de SOLO LECTURA y lee únicamente
// la fila de user_data del dueño: en esa tabla hay otras cuentas.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DUENO = "c4e734ed-ffce-41bb-befd-4b9092a7ad51"; // moisstamoy@gmail.com
const ZONA = "Europe/Lisbon";

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`base de datos (${r.status}): ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
const rpc = (fn: string, args: Record<string, unknown>) => rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });

async function datos() {
  const filas = await rest(`user_data?id=eq.${DUENO}&select=habits_data,tasks_data,finances_data,updated_at`);
  if (!filas?.length) throw new Error("no encontré tus datos");
  return filas[0];
}

// ── Fechas: el día de Congruence empieza a las 5 AM, igual que la app ──
function hoyClave(): string {
  const ahora = new Date(Date.now() - 5 * 3600_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}
const sumar = (dia: string, n: number) => {
  const d = new Date(dia + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
};
const lunes = (dia: string) => { const w = new Date(dia + "T12:00:00Z").getUTCDay(); return sumar(dia, -((w + 6) % 7)); };
const valida = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

// ── Hábitos: mismas reglas que HabitStore.congruence ──
const enPausa = (log: any) => log?.status === "rest" || log?.status === "emergency";
function semana(h: any, dia: string) {
  const l = lunes(dia); let n = 0;
  for (let i = 0; i < 7; i++) if (h.logs?.[sumar(l, i)]?.completed) n++;
  return n;
}
function estabilidad(habits: any[], dia: string): number {
  if (!habits.length) return 0;
  let hechos = 0, aplican = 0, algo = false;
  for (const h of habits) {
    const log = h.logs?.[dia];
    if (log) algo = true;
    if (enPausa(log)) continue;
    if (h.weeklyTarget && !log?.completed && semana(h, dia) >= h.weeklyTarget) continue;
    aplican++; if (log?.completed) hechos++;
  }
  if (!algo) return 0;
  if (!aplican) return -1;
  return Math.round(hechos / aplican * 100);
}
function racha(habits: any[], dia: string) {
  let n = 0;
  for (let i = 0; i <= 365; i++) {
    const c = estabilidad(habits, sumar(dia, -i));
    if (c > 0 || c === -1) n++; else if (i > 0) break;
  }
  return n;
}
const pct = (c: number) => (c === -1 ? "en pausa" : `${c}%`);

// ── Finanzas ──
function presupuesto(f: any, mes: string) {
  const cambios = Object.entries(f?.config?.budgetChanges || {}).filter(([k]) => k <= mes).sort(([a], [b]) => (a < b ? 1 : -1));
  return Number(cambios[0]?.[1] ?? f?.config?.monthlyFixedBudget ?? 0);
}
const gastosDe = (f: any) => (f?.realExpenses || []).filter((g: any) => g.type !== "income");

// ── Herramientas ──
const FECHA = (d: string) => ({ type: "string", description: `AAAA-MM-DD (vacío = ${d})` });
const MES = { type: "string", description: "Mes 'AAAA-MM' (vacío = mes actual)." };

const herramientas: any[] = [
  {
    name: "resumen_dia",
    description: "Cómo va un día (por defecto hoy): % de estabilidad, hábitos hechos y pendientes, racha, tareas prioritarias pendientes, tareas que vencen ese día y gasto del día.",
    inputSchema: { type: "object", properties: { fecha: FECHA("hoy") } },
    run: (d: any, a: any) => {
      const dia = valida(a.fecha) ? a.fecha : hoyClave();
      const hs = d.habits_data?.habits || [];
      const tareas = (d.tasks_data?.tasks || []).filter((t: any) => !t.completed);
      return {
        fecha: dia,
        estabilidad: pct(estabilidad(hs, dia)),
        racha_dias: racha(hs, dia),
        habitos: hs.map((h: any) => {
          const log = h.logs?.[dia];
          return {
            habito: h.title, icono: h.icon,
            estado: log?.completed ? "hecho" : enPausa(log) ? (log.status === "rest" ? "descanso" : "imprevisto")
              : h.weeklyTarget && semana(h, dia) >= h.weeklyTarget ? "mínimo semanal cumplido" : "pendiente",
            ...(h.type === "numeric" ? { valor: log?.value ?? 0, meta: h.goal, unidad: h.unit } : {}),
            ...(h.weeklyTarget ? { semana: `${semana(h, dia)}/${h.weeklyTarget}` } : {}),
          };
        }),
        prioritarias_pendientes: tareas.filter((t: any) => t.tier === "key").map((t: any) => t.text),
        vencen_este_dia: tareas.filter((t: any) => t.deadline === dia).map((t: any) => t.text),
        vencidas: tareas.filter((t: any) => t.deadline && t.deadline < dia).map((t: any) => ({ tarea: t.text, vencio: t.deadline })),
        gastado_este_dia: gastosDe(d.finances_data).filter((g: any) => g.date === dia).reduce((s: number, g: any) => s + Number(g.amount || 0), 0),
      };
    },
  },
  {
    name: "habitos",
    description: "Cada hábito con lo cumplido en los últimos N días (por defecto 30), su semana actual frente al mínimo semanal y su racha propia.",
    inputSchema: { type: "object", properties: { dias: { type: "number", description: "Cuántos días mirar hacia atrás (1–365, por defecto 30)." } } },
    run: (d: any, a: any) => {
      const n = Math.min(365, Math.max(1, Number(a.dias) || 30));
      const hoy = hoyClave();
      return (d.habits_data?.habits || []).map((h: any) => {
        let hechos = 0, pausas = 0, propia = 0, corta = false;
        for (let i = 0; i < n; i++) {
          const log = h.logs?.[sumar(hoy, -i)];
          if (log?.completed) hechos++; else if (enPausa(log)) pausas++;
        }
        for (let i = 0; i <= 365 && !corta; i++) {
          const log = h.logs?.[sumar(hoy, -i)];
          if (log?.completed || enPausa(log)) propia++; else if (i > 0) corta = true;
        }
        return {
          habito: h.title, icono: h.icon, tipo: h.type,
          ...(h.weeklyTarget ? { minimo_semanal: h.weeklyTarget, esta_semana: semana(h, hoy) } : {}),
          [`hechos_ultimos_${n}_dias`]: hechos, pausas, racha_propia: propia,
        };
      });
    },
  },
  {
    name: "historial_estabilidad",
    description: "El % de estabilidad de cada día entre dos fechas (máx. 366 días), con el promedio y la racha actual.",
    inputSchema: { type: "object", properties: { desde: FECHA("hace 30 días"), hasta: FECHA("hoy") } },
    run: (d: any, a: any) => {
      const hasta = valida(a.hasta) ? a.hasta : hoyClave();
      let desde = valida(a.desde) ? a.desde : sumar(hasta, -29);
      if (desde < sumar(hasta, -365)) desde = sumar(hasta, -365);
      const hs = d.habits_data?.habits || [];
      const dias: any[] = [];
      for (let x = desde; x <= hasta; x = sumar(x, 1)) dias.push({ fecha: x, estabilidad: pct(estabilidad(hs, x)) });
      const nums = dias.map((x) => parseInt(x.estabilidad)).filter((v) => !isNaN(v));
      return { desde, hasta, promedio: nums.length ? `${Math.round(nums.reduce((s, v) => s + v, 0) / nums.length)}%` : "—",
        racha_actual: racha(hs, hasta), dias };
    },
  },
  {
    name: "tareas",
    description: "Tareas pendientes (o las hechas), con su tipo (prioritaria, no brain, secundaria), grupo y fecha límite. Se puede filtrar por grupo, por texto o solo prioritarias.",
    inputSchema: { type: "object", properties: {
      estado: { type: "string", enum: ["pendientes", "hechas"], description: "Por defecto, pendientes." },
      solo_prioritarias: { type: "boolean" },
      grupo: { type: "string", description: "Nombre del grupo." },
      texto: { type: "string", description: "Busca en el texto de la tarea." },
    } },
    run: (d: any, a: any) => {
      const grupos = Object.fromEntries((d.tasks_data?.groups || []).map((g: any) => [g.id, g.name]));
      const tipo: any = { key: "prioritaria", easy: "no brain", minor: "secundaria" };
      const hechas = a.estado === "hechas";
      return (d.tasks_data?.tasks || [])
        .filter((t: any) => !!t.completed === hechas)
        .filter((t: any) => !a.solo_prioritarias || t.tier === "key")
        .filter((t: any) => !a.grupo || (grupos[t.groupId] || "").toLowerCase().includes(String(a.grupo).toLowerCase()))
        .filter((t: any) => !a.texto || String(t.text || "").toLowerCase().includes(String(a.texto).toLowerCase()))
        .sort((x: any, y: any) => hechas ? (y.completedAt || 0) - (x.completedAt || 0) : (x.createdAt || 0) - (y.createdAt || 0))
        .slice(0, 200)
        .map((t: any) => ({
          tarea: t.text, tipo: tipo[t.tier] || "sin clasificar", grupo: grupos[t.groupId] || null,
          fecha_limite: t.deadline || null, en_curso: !!t.inProgress,
          ...(hechas && t.completedAt ? { hecha: new Date(t.completedAt).toISOString().slice(0, 10) } : {}),
        }));
    },
  },
  {
    name: "notas",
    description: "Notas y entradas del diario, de la más reciente a la más vieja, opcionalmente filtradas por texto.",
    inputSchema: { type: "object", properties: {
      texto: { type: "string", description: "Busca en el título y el contenido." },
      limite: { type: "number", description: "Cuántas devolver (1–50, por defecto 10)." },
    } },
    run: (d: any, a: any) => {
      const q = String(a.texto || "").toLowerCase();
      return (d.tasks_data?.notes || [])
        .filter((n: any) => !q || `${n.title || ""} ${n.content || ""}`.toLowerCase().includes(q))
        .sort((x: any, y: any) => (y.updatedAt || y.createdAt || 0) - (x.updatedAt || x.createdAt || 0))
        .slice(0, Math.min(50, Math.max(1, Number(a.limite) || 10)))
        .map((n: any) => ({ titulo: n.title || null, texto: n.content,
          fecha: n.createdAt ? new Date(n.createdAt).toISOString().slice(0, 10) : null }));
    },
  },
  {
    name: "finanzas_mes",
    description: "Gastos reales de un mes por categoría frente a sus presupuestos, total frente al presupuesto variable del mes, cuánto queda y cuánto da por día para lo que falta.",
    inputSchema: { type: "object", properties: { mes: MES } },
    run: (d: any, a: any) => {
      const hoy = hoyClave();
      const mes = /^\d{4}-\d{2}$/.test(a.mes || "") ? a.mes : hoy.slice(0, 7);
      const f = d.finances_data || {};
      const gs = gastosDe(f).filter((g: any) => String(g.date || "").startsWith(mes));
      const por: Record<string, number> = {};
      for (const g of gs) por[g.category || "Sin categoría"] = (por[g.category || "Sin categoría"] || 0) + Number(g.amount || 0);
      const tope = presupuesto(f, mes);
      const total = Object.values(por).reduce((s, v) => s + v, 0);
      const ultimo = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate();
      const quedan = mes === hoy.slice(0, 7) ? ultimo - +hoy.slice(8, 10) + 1 : 0;
      const budgets = f.categoryBudgets || {};
      return {
        mes, presupuesto_variable: tope, gastado: Math.round(total * 100) / 100, queda: Math.round((tope - total) * 100) / 100,
        ...(quedan ? { dias_que_quedan: quedan, por_dia: Math.round((tope - total) / quedan * 100) / 100 } : {}),
        por_categoria: Object.entries(por).sort(([, x], [, y]) => y - x).map(([categoria, gastado]) => ({
          categoria, gastado: Math.round(gastado * 100) / 100,
          ...(budgets[categoria] != null ? { presupuesto: budgets[categoria], queda: Math.round((budgets[categoria] - gastado) * 100) / 100 } : {}),
        })),
        objetivo_ingresos: f.config?.monthlyIncomeGoal ?? null,
      };
    },
  },
  {
    name: "gastos",
    description: "Lista de gastos reales entre dos fechas (máx. 300), opcionalmente de una categoría.",
    inputSchema: { type: "object", properties: { desde: FECHA("inicio del mes"), hasta: FECHA("hoy"), categoria: { type: "string" } } },
    run: (d: any, a: any) => {
      const hoy = hoyClave();
      const desde = valida(a.desde) ? a.desde : hoy.slice(0, 8) + "01";
      const hasta = valida(a.hasta) ? a.hasta : hoy;
      return gastosDe(d.finances_data)
        .filter((g: any) => g.date >= desde && g.date <= hasta)
        .filter((g: any) => !a.categoria || String(g.category || "").toLowerCase().includes(String(a.categoria).toLowerCase()))
        .sort((x: any, y: any) => (x.date < y.date ? 1 : -1))
        .slice(0, 300)
        .map((g: any) => ({ fecha: g.date, monto: g.amount, categoria: g.category, nota: g.note || null }));
    },
  },
];

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const ok = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const err = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

async function manejar(msg: any) {
  const { id, method, params } = msg || {};
  if (id === undefined || id === null) return null; // notificación (p. ej. notifications/initialized)
  if (method === "initialize") {
    return ok(id, { protocolVersion: params?.protocolVersion || "2025-06-18", capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "congruence", title: "Congruence · Hábitos, tareas y finanzas", version: "1.0.0" },
      instructions: "Datos personales de Congruence (solo lectura). Responde en español neutro. " +
        "Estabilidad = % de hábitos cumplidos del día; los días en pausa (descanso o imprevisto) no cuentan, y un hábito semanal " +
        "que ya cumplió su mínimo sale del cálculo. El día empieza a las 5 AM. Racha = días seguidos con algo cumplido." });
  }
  if (method === "ping") return ok(id, {});
  if (method === "tools/list") {
    return ok(id, { tools: herramientas.map(({ run, ...t }) => ({ ...t, annotations: { readOnlyHint: true } })) });
  }
  if (method === "tools/call") {
    const h = herramientas.find((t) => t.name === params?.name);
    if (!h) return err(id, -32602, `Herramienta desconocida: ${params?.name}`);
    try {
      const data = h.run(await datos(), params?.arguments || {});
      return ok(id, { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: Array.isArray(data) ? { items: data } : (data ?? {}) });
    } catch (e) {
      return ok(id, { content: [{ type: "text", text: "No se pudo leer: " + (e as Error).message }], isError: true });
    }
  }
  return err(id, -32601, `Método no soportado: ${method}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  // la clave de Claude llega SOLO por encabezado; la de Grok, en la ruta /g/<clave> (Grok no manda encabezados)
  const clave = req.headers.get("x-api-key") || "";
  const enRuta = (new URL(req.url).pathname.match(/\/g\/([A-Za-z0-9]{32,})\/?$/) || [])[1] || "";
  let es = false;
  try { es = clave ? await rpc("mcp_token_ok", { p: clave }) : enRuta ? await rpc("mcp_token_grok_ok", { p: enRuta }) : false; } catch (_) { es = false; }
  // 403 y no 401: un 401 hace que Claude intente un inicio de sesión OAuth que este conector no usa
  if (!es) return json({ error: "clave inválida o faltante" }, 403);
  if (req.method === "GET") return new Response("Congruence · conector MCP (usa POST)", { status: 405, headers: { ...CORS, Allow: "POST" } });
  if (req.method === "DELETE") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "método no permitido" }, 405);
  let body: any;
  try { body = await req.json(); } catch (_) { return json(err(null, -32700, "JSON inválido"), 400); }
  if (Array.isArray(body)) {
    const res = (await Promise.all(body.map(manejar))).filter(Boolean);
    return res.length ? json(res) : new Response(null, { status: 202, headers: CORS });
  }
  const r = await manejar(body);
  return r ? json(r) : new Response(null, { status: 202, headers: CORS });
});
