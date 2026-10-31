#!/bin/bash
# Conector de Congruence (Claude y Grok): copia la clave o la URL al portapapeles SIN mostrarla.
#   ./herramientas/clave_conector.sh               → clave de Claude (va en el encabezado x-api-key)
#   ./herramientas/clave_conector.sh grok          → URL COMPLETA para Grok (lleva su propia clave adentro)
#   ./herramientas/clave_conector.sh [grok] rotar  → genera una clave nueva (la vieja deja de servir) y la copia
# Las claves viven en el Vault de Supabase (supabase/mcp-congruence.sql); cada una se corta sin tocar la otra.
set -eo pipefail
REF=vbtshztpqlliytgbdjzm
URL="https://$REF.supabase.co/functions/v1/congruence-mcp"
SECRETO=mcp_congruence_token; GROK=
[ "$1" = "grok" ] && { GROK=1; SECRETO=mcp_congruence_grok_token; shift; }
T=$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null); case "$T" in go-keyring-base64:*) T=$(printf %s "${T#go-keyring-base64:}" | base64 -d);; esac
[ -z "$T" ] && { echo "No encontré el token de Supabase en el llavero (\"Supabase CLI\"). Entra con: supabase login"; exit 1; }
sql() { python3 -c 'import json,sys;print(json.dumps({"query":sys.argv[1]}))' "$1" | curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" -H "Authorization: Bearer $T" -H "Content-Type: application/json" --data-binary @-; }
if [ "$1" = "rotar" ]; then
  sql "select vault.update_secret((select id from vault.secrets where name='$SECRETO'), encode(extensions.gen_random_bytes(24),'hex'));" > /dev/null
  echo "Clave nueva generada; la anterior ya no sirve."
fi
LEER="select decrypted_secret k from vault.decrypted_secrets where name='$SECRETO';"
if [ -n "$GROK" ]; then
  sql "$LEER" | python3 -c 'import json,sys;d=json.load(sys.stdin);sys.stdout.write(sys.argv[1]+"/g/"+d[0]["k"]) if d else sys.exit("Falta la clave de Grok en el Vault (supabase/mcp-congruence.sql).")' "$URL" | pbcopy
  echo "URL de Grok copiada al portapapeles (lleva la clave adentro: no la compartas)."
  echo "Pégala en grok.com → Conectores → New Connector → Custom."; exit 0
fi
sql "$LEER" | python3 -c 'import json,sys;sys.stdout.write(json.load(sys.stdin)[0]["k"])' | pbcopy
echo "Clave de Claude copiada al portapapeles (no se muestra)."
echo "URL del conector: $URL  (en Claude.ai: Conectores → Agregar personalizado → encabezado x-api-key)"
