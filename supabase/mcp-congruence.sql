-- Conector de Congruence (servidor MCP en supabase/functions/congruence-mcp), solo lectura.
-- Dos claves aparte en el Vault, generadas acá y nunca escritas en el código:
--   mcp_congruence_token       → Claude, en el encabezado x-api-key
--   mcp_congruence_grok_token  → Grok, que solo acepta una URL: …/congruence-mcp/g/<clave>
-- Cada una se cambia sola sin cortar la otra: ./herramientas/clave_conector.sh [grok] rotar
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'mcp_congruence_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'mcp_congruence_token', 'Clave del conector Congruence para Claude (encabezado x-api-key)');
  end if;
  if not exists (select 1 from vault.secrets where name = 'mcp_congruence_grok_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'mcp_congruence_grok_token', 'Clave del conector Congruence para Grok (va en la URL)');
  end if;
end $$;

create or replace function public.mcp_token_ok(p text) returns boolean
  language sql stable security definer set search_path to 'public' as $f$
  select coalesce(length(p) >= 32 and p = (select decrypted_secret from vault.decrypted_secrets where name = 'mcp_congruence_token'), false)
$f$;
create or replace function public.mcp_token_grok_ok(p text) returns boolean
  language sql stable security definer set search_path to 'public' as $f$
  select coalesce(length(p) >= 32 and p = (select decrypted_secret from vault.decrypted_secrets where name = 'mcp_congruence_grok_token'), false)
$f$;
revoke all on function public.mcp_token_ok(text) from public, anon, authenticated;
revoke all on function public.mcp_token_grok_ok(text) from public, anon, authenticated;
