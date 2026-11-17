-- Nossos Achadinhos: histórico compartilhado dos posts enviados.
-- Rode este arquivo inteiro em Supabase > SQL Editor > New query > Run.

create table if not exists public.posts (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid not null default auth.uid() references auth.users (id),
  quem        text not null,
  tipo        text not null check (tipo in ('oferta', 'cupom')),
  titulo      text not null,
  detalhe     text,
  cupom       text
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

-- Quem está logado vê tudo (Junior e Thai enxergam os posts um do outro).
drop policy if exists "logados leem" on public.posts;
create policy "logados leem" on public.posts
  for select to authenticated using (true);

-- Cada um só grava posts em seu próprio nome.
drop policy if exists "logado grava o seu" on public.posts;
create policy "logado grava o seu" on public.posts
  for insert to authenticated with check (user_id = auth.uid());
