begin;

-- Authenticated users could previously update every column of their own
-- public.users row with the anon key, including stripe_customer_id. The
-- billing portal route trusts that column, so it must only be written by the
-- server (service role). Students may still edit their display name.
revoke update on public.users from authenticated;
grant update (full_name) on public.users to authenticated;

commit;
