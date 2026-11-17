-- Nossos Achadinhos: tabelas do app dentro do projeto do Supabase do Caixa (plano gratuito só permite 2 projetos).
-- Tudo tem o prefixo achadinhos_ e não toca em nada do Caixa. Aplicado em 17/11/2026, migração "achadinhos_conta_unica".
-- Para remover tudo: drop trigger achadinhos_primeiro_membro on auth.users; drop table public.achadinhos_posts, public.achadinhos_membros; drop schema achadinhos_privado cascade;
-- Quem tem acesso: as duas contas do Caixa (Junior e Thai), incluídas em achadinhos_membros em 17/11/2026 com
--   insert into public.achadinhos_membros (user_id) select id from public.perfis;
-- O gatilho abaixo só incluiria a primeira conta nova se a tabela estivesse vazia; hoje não inclui ninguém.

create schema if not exists achadinhos_privado;

create table public.achadinhos_membros (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  criado_em  timestamptz not null default now()
);
alter table public.achadinhos_membros enable row level security;
create policy achadinhos_membros_ler_o_seu on public.achadinhos_membros
  for select to authenticated using (user_id = (select auth.uid()));

create function achadinhos_privado.is_membro() returns boolean
  language sql stable security definer set search_path = ''
  as $$ select exists (select 1 from public.achadinhos_membros where user_id = (select auth.uid())); $$;
revoke all on function achadinhos_privado.is_membro() from public, anon;
grant usage on schema achadinhos_privado to authenticated;
grant execute on function achadinhos_privado.is_membro() to authenticated;

create function achadinhos_privado.primeiro_membro() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
begin
  insert into public.achadinhos_membros (user_id)
  select new.id where not exists (select 1 from public.achadinhos_membros);
  return new;
end $$;
revoke all on function achadinhos_privado.primeiro_membro() from public, anon, authenticated;
create trigger achadinhos_primeiro_membro after insert on auth.users
  for each row execute function achadinhos_privado.primeiro_membro();

create table public.achadinhos_posts (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid not null default auth.uid() references auth.users (id),
  quem        text not null,
  tipo        text not null check (tipo in ('oferta', 'cupom')),
  titulo      text not null,
  detalhe     text,
  cupom       text
);
create index achadinhos_posts_created_at_idx on public.achadinhos_posts (created_at desc);
create index achadinhos_posts_user_id_idx on public.achadinhos_posts (user_id);
alter table public.achadinhos_posts enable row level security;
create policy achadinhos_posts_ler on public.achadinhos_posts
  for select to authenticated using ((select achadinhos_privado.is_membro()));
create policy achadinhos_posts_gravar on public.achadinhos_posts
  for insert to authenticated with check ((select achadinhos_privado.is_membro()) and user_id = (select auth.uid()));
