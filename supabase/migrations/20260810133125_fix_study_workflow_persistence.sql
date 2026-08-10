begin;

alter table public.study_plans
  add constraint study_plans_user_id_key unique (user_id);

drop policy if exists study_files_select_own on storage.objects;
create policy study_files_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'study-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
