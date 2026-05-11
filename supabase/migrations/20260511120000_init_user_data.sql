-- Whisky 앱: 클라우드 저장·약한 카테고리·오답 노트용 스키마 (RLS)
-- Apply: Supabase Dashboard SQL 또는 `supabase db push` / 로컬 링크 후 migration

-- ---------------------------------------------------------------------------
-- profiles: 표시명 등 (auth.users 1:1)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 新規サインアップ時にプロフィール行を自動作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      nullif(trim(split_part(new.email, '@', 1)), '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- saved_question_sets: 生成問題セットのクラウド保存（全員閲覧・編集は作者のみ）
-- ---------------------------------------------------------------------------
create table if not exists public.saved_question_sets (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled',
  questions jsonb not null default '[]'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_question_sets_author_id_idx
  on public.saved_question_sets (author_id);
create index if not exists saved_question_sets_created_at_idx
  on public.saved_question_sets (created_at desc);

alter table public.saved_question_sets enable row level security;

-- ログインユーザーは一覧・詳細を閲覧可能（将来 is_public=false のときは条件を絞る）
create policy "saved_question_sets_select_authenticated"
  on public.saved_question_sets for select
  to authenticated
  using (is_public or author_id = auth.uid());

create policy "saved_question_sets_insert_own_author"
  on public.saved_question_sets for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "saved_question_sets_update_author_only"
  on public.saved_question_sets for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "saved_question_sets_delete_author_only"
  on public.saved_question_sets for delete
  to authenticated
  using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- practice_attempts: カテゴリ別の正誤ログ（弱点可視化の集計元）
-- ---------------------------------------------------------------------------
create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'unknown',
  question_type text,
  correct boolean not null,
  external_question_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists practice_attempts_user_category_idx
  on public.practice_attempts (user_id, category);
create index if not exists practice_attempts_user_created_idx
  on public.practice_attempts (user_id, created_at desc);

alter table public.practice_attempts enable row level security;

create policy "practice_attempts_select_own"
  on public.practice_attempts for select
  to authenticated
  using (user_id = auth.uid());

create policy "practice_attempts_insert_own"
  on public.practice_attempts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "practice_attempts_update_own"
  on public.practice_attempts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "practice_attempts_delete_own"
  on public.practice_attempts for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- wrong_answer_notes: オ답ノート（本人のみ）
-- ---------------------------------------------------------------------------
create table if not exists public.wrong_answer_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_snapshot jsonb not null,
  expected_answer jsonb,
  user_answer jsonb,
  source_set_id uuid references public.saved_question_sets (id) on delete set null,
  external_question_key text,
  resolved boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wrong_answer_notes_user_created_idx
  on public.wrong_answer_notes (user_id, created_at desc);

alter table public.wrong_answer_notes enable row level security;

create policy "wrong_answer_notes_select_own"
  on public.wrong_answer_notes for select
  to authenticated
  using (user_id = auth.uid());

create policy "wrong_answer_notes_insert_own"
  on public.wrong_answer_notes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "wrong_answer_notes_update_own"
  on public.wrong_answer_notes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "wrong_answer_notes_delete_own"
  on public.wrong_answer_notes for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- updated_at トリガー
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_question_sets_set_updated_at on public.saved_question_sets;
create trigger saved_question_sets_set_updated_at
  before update on public.saved_question_sets
  for each row execute function public.set_updated_at();

drop trigger if exists wrong_answer_notes_set_updated_at on public.wrong_answer_notes;
create trigger wrong_answer_notes_set_updated_at
  before update on public.wrong_answer_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 弱点カテゴリ用ビュー（RLSは下位テーブルに委譲 / invoker）
-- ---------------------------------------------------------------------------
create or replace view public.user_weak_categories
with (security_invoker = true) as
select
  user_id,
  category,
  count(*)::bigint as attempts,
  sum(case when correct then 1 else 0 end)::bigint as correct_count,
  sum(case when not correct then 1 else 0 end)::bigint as wrong_count
from public.practice_attempts
group by user_id, category;

grant select on public.user_weak_categories to authenticated;
