// Trello ↔ Congruence. Las tarjetas del tablero Sales aparecen en tus tareas (grupo "Sales") y su estado
// queda igual en los dos lados:
//   Trello: lista "Hecho" o tarjeta marcada como completa → hecho · lista "En proceso" → proceso · el resto → pendiente
//   Congruence: completed → hecho · inProgress → proceso · el resto → pendiente
// Marcar en Congruence mueve la tarjeta a "Hecho" (y la marca completa); desmarcar la devuelve a "Lista de tareas".
// Las tareas nuevas de Congruence NO se suben a Trello: solo se copian las de Trello.
//
// Quién la llama (supabase/trello-sync.sql): el webhook de Trello (…/trello-sync/w/<clave>), un trigger cuando cambia
// tasks_data y un cron cada 5 minutos, los dos con la clave en x-sync-secret. El aviso no importa: siempre compara el
// tablero entero contra tus tareas, con lo último visto de cada par (tabla trello_sync) para saber qué lado cambió.
// Si los dos cambiaron distinto, gana Trello.
//
// Necesita los secretos TRELLO_KEY y TRELLO_TOKEN (Supabase → Edge Functions → Secrets). Sin ellos no hace nada.

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRELLO_KEY = Deno.env.get("TRELLO_KEY") || "";
const TRELLO_TOKEN = Deno.env.get("TRELLO_TOKEN") || "";
const TABLERO = "6aefb9e5bf4370896af5f66c"; // Sales
const GRUPO = { id: "trello-sales", name: "Sales", color: "#0c66e4" };
const ZONA = "Europe/Lisbon";
const URL_PROPIA = `${SB_URL}/functions/v1/trello-sync`;

type Estado = "pendiente" | "proceso" | "hecho";

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal", ...(init.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`base de datos (${r.status}): ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}
const rpc = (fn: string, args: Record<string, unknown> = {}) =>
  rest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args), headers: { Prefer: "" } });

async function trello(method: string, path: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams({ ...params, key: TRELLO_KEY, token: TRELLO_TOKEN });
  const r = await fetch(`https://api.trello.com/1${path}?${q}`, { method });
  const t = await r.text();
  if (!r.ok) throw new Error(`Trello ${method} ${path} (${r.status}): ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

const diaDe = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)) : null;

function estadoCongruence(t: any): Estado {
  return t.completed ? "hecho" : t.inProgress ? "proceso" : "pendiente";
}

function aplicarATarea(t: any, e: Estado) {
  t.completed = e === "hecho";
  t.completedAt = e === "hecho" ? (t.completedAt || Date.now()) : null;
  t.inProgress = e === "proceso";
}

function tareaNueva(card: any, e: Estado) {
  const t: any = {
    id: `trello-${card.id}`, text: card.name, groupId: GRUPO.id, deadline: diaDe(card.due),
    priority: null, createdAt: parseInt(card.id.slice(0, 8), 16) * 1000,
  };
  aplicarATarea(t, e);
  return t;
}

async function sincronizar() {
  const listas: any[] = await trello("GET", `/boards/${TABLERO}/lists`, { fields: "name" });
  const porNombre = (n: string) => listas.find((l) => l.name.trim().toLowerCase() === n)?.id;
  const L = { pendiente: porNombre("lista de tareas") || listas[0]?.id, proceso: porNombre("en proceso"), hecho: porNombre("hecho") };
  const estadoTrello = (c: any): Estado =>
    c.idList === L.hecho || c.dueComplete ? "hecho" : c.idList === L.proceso ? "proceso" : "pendiente";

  const cards: any[] = await trello("GET", `/boards/${TABLERO}/cards/all`, { fields: "name,idList,closed,dueComplete,due" });
  const pares: any[] = (await rest("trello_sync?select=*", { headers: { Prefer: "" } })) || [];
  const par = new Map(pares.map((p) => [p.card_id, p]));
  const { tasks: doc, md5 } = await rpc("trello_sync_read");

  const tasksDoc = structuredClone(doc || {});
  tasksDoc.tasks ||= [];
  tasksDoc.groups ||= [];
  const tareas: any[] = tasksDoc.tasks;
  const indice = new Map(tareas.map((t, i) => [t.id, i]));
  let cambioTareas = false;
  const nuevosPares: any[] = [];
  const paresBorrados: string[] = [];
  const aTrello: { card: any; e: Estado }[] = [];

  const vistas = new Set<string>();
  for (const card of cards) {
    vistas.add(card.id);
    const p = par.get(card.id);
    const eT = estadoTrello(card);

    if (card.closed) {
      // Archivada en Trello: sale de Congruence.
      if (p) {
        const i = indice.get(p.task_id);
        if (i !== undefined) { tareas[i] = null; cambioTareas = true; }
        paresBorrados.push(card.id);
      }
      continue;
    }

    if (!p) {
      const t = tareaNueva(card, eT);
      if (!indice.has(t.id)) { tareas.push(t); indice.set(t.id, tareas.length - 1); cambioTareas = true; }
      nuevosPares.push({ card_id: card.id, task_id: t.id, estado: eT, nombre: card.name });
      continue;
    }

    const i = indice.get(p.task_id);
    if (i === undefined || tareas[i] === null) {
      // No está en Congruence: lo más probable es que otro dispositivo haya subido una lista vieja. Se repone.
      const t = tareaNueva(card, eT);
      tareas.push(t); indice.set(t.id, tareas.length - 1); cambioTareas = true;
      nuevosPares.push({ ...p, task_id: t.id, estado: eT, nombre: card.name });
      continue;
    }

    const t = tareas[i];
    const eC = estadoCongruence(t);
    const antes: Estado = p.estado;
    let final: Estado = antes;
    if (eT !== antes && (eC === antes || eC !== eT)) final = eT;          // cambió Trello (o los dos: gana Trello)
    else if (eC !== antes && eT === antes) final = eC;                    // cambió Congruence
    else if (eT === eC) final = eT;

    if (eC !== final) { aplicarATarea(t, final); cambioTareas = true; }
    if (eT !== final) aTrello.push({ card, e: final });
    if (card.name !== p.nombre && t.text !== card.name) { t.text = card.name; cambioTareas = true; }
    if (final !== antes || card.name !== p.nombre) nuevosPares.push({ ...p, estado: final, nombre: card.name });
  }
  // Tarjetas borradas del todo en Trello.
  for (const p of pares) {
    if (vistas.has(p.card_id)) continue;
    const i = indice.get(p.task_id);
    if (i !== undefined && tareas[i]) { tareas[i] = null; cambioTareas = true; }
    paresBorrados.push(p.card_id);
  }

  if (cambioTareas) {
    tasksDoc.tasks = tareas.filter(Boolean);
    if (tasksDoc.tasks.some((t: any) => t.groupId === GRUPO.id) && !tasksDoc.groups.some((g: any) => g.id === GRUPO.id)) {
      tasksDoc.groups.push(GRUPO);
    }
    // Solo si nadie tocó las tareas desde que se leyeron; si no, se vuelve a empezar.
    if (!(await rpc("trello_sync_write", { p_tasks: tasksDoc, p_md5: md5 }))) return { reintentar: true };
  }

  for (const { card, e } of aTrello) {
    await trello("PUT", `/cards/${card.id}`, {
      idList: (e === "hecho" ? L.hecho : e === "proceso" ? L.proceso : L.pendiente) || card.idList,
      dueComplete: String(e === "hecho"),
    });
  }
  if (nuevosPares.length) {
    await rest("trello_sync?on_conflict=card_id", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(nuevosPares.map((p) => ({ card_id: p.card_id, task_id: p.task_id, estado: p.estado, nombre: p.nombre, updated_at: new Date().toISOString() }))),
    });
  }
  if (paresBorrados.length) {
    await rest(`trello_sync?card_id=in.(${paresBorrados.map(encodeURIComponent).join(",")})`, { method: "DELETE" });
  }
  return { tareas: cambioTareas, trello: aTrello.length, nuevas: nuevosPares.length, borradas: paresBorrados.length };
}

// La primera vez que corre con las claves de Trello, se suscribe a los cambios del tablero.
async function asegurarWebhook(secreto: string) {
  const [estado] = (await rest("trello_sync_estado?id=eq.1&select=webhook_id", { headers: { Prefer: "" } })) || [];
  if (estado?.webhook_id) return;
  const callbackURL = `${URL_PROPIA}/w/${secreto}`;
  const existentes: any[] = await trello("GET", `/tokens/${TRELLO_TOKEN}/webhooks`);
  let w = existentes.find((x) => x.callbackURL === callbackURL && x.idModel === TABLERO);
  if (!w) w = await trello("POST", "/webhooks", { callbackURL, idModel: TABLERO, description: "Congruence" });
  await rest("trello_sync_estado?id=eq.1", { method: "PATCH", body: JSON.stringify({ webhook_id: w.id }) });
}

async function correr(secreto: string) {
  if (!(await rpc("trello_sync_lock"))) return { ocupado: true };
  const resultados: any[] = [];
  try {
    await asegurarWebhook(secreto);
    for (let vuelta = 0; vuelta < 4; vuelta++) {
      const r = await sincronizar();
      resultados.push(r);
      if (!r.reintentar) break;
    }
  } finally {
    // Si llegó otro aviso mientras corría, una vuelta más.
    if (await rpc("trello_sync_unlock")) EdgeRuntime.waitUntil(fetch(URL_PROPIA, { method: "POST", headers: { "x-sync-secret": secreto } }));
  }
  return resultados;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  // Trello comprueba la URL con un HEAD antes de crear el webhook.
  if (req.method === "HEAD") return new Response(null, { status: 200 });
  let secreto = "";
  try { secreto = await rpc("trello_sync_secret"); } catch (_) { /* sin clave */ }
  const enRuta = (new URL(req.url).pathname.match(/\/w\/([A-Za-z0-9]{32,})\/?$/) || [])[1] || "";
  const dada = req.headers.get("x-sync-secret") || enRuta;
  if (!secreto || dada.length < 32 || dada !== secreto) return json({ error: "no autorizado" }, 403);
  if (!TRELLO_KEY || !TRELLO_TOKEN) return json({ error: "faltan TRELLO_KEY y TRELLO_TOKEN en los secretos de la función" }, 503);
  try {
    return json(await correr(secreto));
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
