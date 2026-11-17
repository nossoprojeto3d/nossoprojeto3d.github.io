-- Nossos Achadinhos: banco próprio do app (projeto separado do Caixa).
-- Uma conta só, usada pelo Junior e pela Thai. A primeira conta criada vira membro;
-- contas criadas depois não leem nem gravam nada.

create schema if not exists private;

create table public.membros (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  criado_em  timestamptz not null default now()
);
alter table public.membros enable row level security;
create policy membros_ler_o_seu on public.membros
  for select to authenticated using (user_id = (select auth.uid()));

create function private.is_membro() returns boolean
  language sql stable security definer set search_path = ''
  as $$ select exists (select 1 from public.membros where user_id = (select auth.uid())); $$;
revoke all on function private.is_membro() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_membro() to authenticated;

create function private.primeiro_membro() returns trigger
  language plpgsql security definer set search_path = ''
  as $$
begin
  insert into public.membros (user_id)
  select new.id where not exists (select 1 from public.membros);
  return new;
end $$;
revoke all on function private.primeiro_membro() from public, anon, authenticated;
create trigger primeiro_membro after insert on auth.users
  for each row execute function private.primeiro_membro();

create table public.posts (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid not null default auth.uid() references auth.users (id),
  quem        text not null,
  tipo        text not null check (tipo in ('oferta', 'cupom')),
  titulo      text not null,
  detalhe     text,
  cupom       text
);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_user_id_idx on public.posts (user_id);
alter table public.posts enable row level security;
create policy posts_ler on public.posts
  for select to authenticated using ((select private.is_membro()));
create policy posts_gravar on public.posts
  for insert to authenticated with check ((select private.is_membro()) and user_id = (select auth.uid()));
