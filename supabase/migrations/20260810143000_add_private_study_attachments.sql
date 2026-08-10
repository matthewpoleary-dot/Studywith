begin;

create table if not exists public.study_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  material_id uuid references public.study_materials(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 160),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain')),
  size_bytes bigint not null check (size_bytes between 1 and 8000000),
  extracted_text text not null default '',
  created_at timestamptz not null default now(),
  check ((session_id is not null)::integer + (material_id is not null)::integer = 1)
);

create index if not exists study_attachments_user_created_idx
  on public.study_attachments (user_id, created_at desc);
create index if not exists study_attachments_session_idx
  on public.study_attachments (session_id) where session_id is not null;
create index if not exists study_attachments_material_idx
  on public.study_attachments (material_id) where material_id is not null;

alter table public.study_attachments enable row level security;
drop policy if exists study_attachments_own on public.study_attachments;
create policy study_attachments_own on public.study_attachments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.study_attachments from anon, authenticated;
grant select, insert, delete on public.study_attachments to authenticated;
grant all on public.study_attachments to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-files',
  'study-files',
  false,
  8000000,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists study_files_select_own on storage.objects;
drop policy if exists study_files_insert_own on storage.objects;
drop policy if exists study_files_delete_own on storage.objects;

create policy study_files_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'study-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy study_files_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'study-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy study_files_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'study-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
