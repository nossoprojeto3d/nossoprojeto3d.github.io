-- Nossos Achadinhos: histórico compartilhado dos posts enviados.
-- Já aplicado no projeto do Supabase (o mesmo do Caixa) em 16/11/2026, migração "achadinhos_posts".
-- Usa a função public.is_membro() do Caixa: só quem tem linha em public.perfis lê e grava.

create table if not exists public.achadinhos_posts (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid not null default auth.uid() references auth.users (id),
  quem        text not null,
  tipo        text not null check (tipo in ('oferta', 'cupom')),
  titulo      text not null,
  detalhe     text,
  cupom       text
);

create index if not exists achadinhos_posts_created_at_idx on public.achadinhos_posts (created_at desc);
create index if not exists achadinhos_posts_user_id_idx on public.achadinhos_posts (user_id);

alter table public.achadinhos_posts enable row level security;

create policy achadinhos_posts_ler on public.achadinhos_posts
  for select to authenticated using ((select public.is_membro()));

create policy achadinhos_posts_gravar on public.achadinhos_posts
  for insert to authenticated with check ((select public.is_membro()) and user_id = (select auth.uid()));
