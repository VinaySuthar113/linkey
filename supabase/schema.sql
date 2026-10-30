-- Linkey · Supabase schema
--
-- How to apply
--   1. Supabase dashboard → SQL Editor → New query.
--   2. Paste this whole file and press Run.
--   3. Run `node tools/check-supabase.mjs` from the repo root.
--
-- The file is idempotent: running it again after an edit is safe and will
-- not drop pages. It never deletes user data.
--
-- Model
--   One row per account, keyed by the Supabase auth user id. `data` holds
--   the published page (name, bio, links, theme, style) exactly as the app
--   writes it; it is a JSON document so the designer can evolve without a
--   migration. Visitors may read three columns of *published* rows only.
--
-- Security
--   Row ownership is enforced by RLS (`auth.uid() = user_id`), and the anon
--   role has no INSERT/UPDATE/DELETE privilege at all. Column grants keep
--   `user_id` out of the public projection even if a policy is later
--   loosened by mistake.

create table if not exists public.pages (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  handle     text not null,
  onboarded  boolean not null default false,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table  public.pages is 'One published Linkey page per account.';
comment on column public.pages.handle is 'Public address; lowercase, unique.';
comment on column public.pages.data is 'Page document: name, bio, links, theme, style.';

-- The handle is a public URL segment, so it is unique, lowercase and
-- URL-safe. The app normalises first; the database is the backstop.
-- NOT VALID lets this be added to an existing table without scanning it,
-- while still rejecting every new bad write.
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'pages_handle_shape'
       and conrelid = 'public.pages'::regclass
  ) then
    alter table public.pages add constraint pages_handle_shape check (
      handle = lower(handle)
      and handle ~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$'
      and handle !~ '[._-]{2}'
    ) not valid;
  end if;
end
$$;

create unique index if not exists pages_handle_key
  on public.pages (handle);

create or replace function public.pages_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pages_touch_updated_at on public.pages;
create trigger pages_touch_updated_at
  before update on public.pages
  for each row execute function public.pages_touch_updated_at();

-- ---------------------------------------------------------------- RLS --

alter table public.pages enable row level security;

drop policy if exists pages_owner_read   on public.pages;
drop policy if exists pages_owner_insert on public.pages;
drop policy if exists pages_owner_update on public.pages;
drop policy if exists pages_owner_delete on public.pages;
drop policy if exists pages_public_read  on public.pages;

create policy pages_owner_read on public.pages
  for select to authenticated
  using (auth.uid() = user_id);

create policy pages_owner_insert on public.pages
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy pages_owner_update on public.pages
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy pages_owner_delete on public.pages
  for delete to authenticated
  using (auth.uid() = user_id);

-- Visitors (no session) may read a page only after onboarding. Column
-- grants below narrow this to the three fields the public page needs.
create policy pages_public_read on public.pages
  for select to anon
  using (onboarded = true);

-- ------------------------------------------------- handle availability --
--
-- The signup form and the final setup step both ask this before publishing.
-- It has to be SECURITY DEFINER: RLS hides other people's drafts from the
-- anon role, and a plain select would report a reserved-but-unpublished
-- handle as free. Only a boolean leaves the function, never row data.
-- The caller's own row is excluded so re-saving your username is not a
-- collision.

create or replace function public.handle_taken(candidate text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.pages
     where handle = lower(candidate)
       and (auth.uid() is null or user_id <> auth.uid())
  );
$$;

revoke all on function public.handle_taken(text) from public;
grant execute on function public.handle_taken(text) to anon, authenticated;

-- ------------------------------------------------------------- grants --
--
-- Supabase's default grants are wide. Replace them with the smallest set
-- the app actually uses: owners read/write their own row; visitors read a
-- published projection and nothing else.

revoke all on table public.pages from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select (handle, onboarded, data) on table public.pages to anon;

grant select, insert, update, delete on table public.pages to authenticated;

-- ------------------------------------------------------------- contacts --
-- One row per signup captured from a published page's form. `user_id` is
-- the page owner; anon may only insert (a visitor signing up), never read.
-- The owner reads/deletes their own contacts via RLS.

create table if not exists public.contacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  page_handle text not null,
  name       text not null default '',
  email      text not null default '',
  source     text not null default '',
  created_at timestamptz not null default now()
);

comment on table  public.contacts is 'Signups captured from published Linkey pages.';
comment on column public.contacts.user_id is 'The page owner who received the signup.';
comment on column public.contacts.page_handle is 'The public address whose form captured this signup.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'contacts_email_shape' and conrelid = 'public.contacts'::regclass
  ) then
    alter table public.contacts add constraint contacts_email_shape check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') not valid;
  end if;
end
$$;

create index if not exists contacts_user_id_idx on public.contacts (user_id);
create index if not exists contacts_page_handle_idx on public.contacts (page_handle);

alter table public.contacts enable row level security;

drop policy if exists contacts_owner_read   on public.contacts;
drop policy if exists contacts_owner_delete on public.contacts;
drop policy if exists contacts_anon_insert  on public.contacts;

create policy contacts_owner_read on public.contacts
  for select to authenticated
  using (auth.uid() = user_id);

create policy contacts_owner_delete on public.contacts
  for delete to authenticated
  using (auth.uid() = user_id);

-- A visitor submitting a form on a published page may insert a contact.
-- The page must exist and be onboarded; the owner is resolved from it.
create policy contacts_anon_insert on public.contacts
  for insert to anon
  with check (
    exists (
      select 1 from public.pages
      where handle = contacts.page_handle
        and onboarded = true
    )
  );

-- ------------------------------------------------------------- grants --
-- Reflect the new table immediately in PostgREST instead of waiting for
-- the schema cache to refresh on its own.

revoke all on table public.contacts from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant insert on table public.contacts to anon;
grant select, insert, delete on table public.contacts to authenticated;

notify pgrst, 'reload schema';
notify pgrst, 'reload schema';
