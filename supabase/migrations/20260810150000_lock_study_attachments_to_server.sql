begin;

-- Attachment metadata and extracted text are intentionally server-only.
-- Students upload and clean up their own objects through Storage RLS, while
-- authenticated application routes verify ownership before serving a file.
revoke all on public.study_attachments from anon, authenticated;
grant all on public.study_attachments to service_role;

drop policy if exists study_files_select_own on storage.objects;

commit;
