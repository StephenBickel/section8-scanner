-- Additive migration: existing deals, reports and browser bookmarks are untouched.
create table public.property_analyses (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 64000),
  created_at timestamptz not null default now()
);
create index property_analyses_owner_created on public.property_analyses(user_id, created_at desc);
alter table public.property_analyses enable row level security;
revoke all on public.property_analyses from public, anon, authenticated;
grant select, delete on public.property_analyses to authenticated;
grant select, insert, delete on public.property_analyses to service_role;
create policy analysis_owner_read on public.property_analyses for select to authenticated using ((select auth.uid()) = user_id);
create policy analysis_owner_delete on public.property_analyses for delete to authenticated using ((select auth.uid()) = user_id);

-- Only the application server can write computed snapshots. A profile row lock
-- makes the account limit atomic; immutable IDs make retries safe.
create function public.save_property_analysis(p_id uuid, p_user_id uuid, p_snapshot jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  existing public.property_analyses;
  saved public.property_analyses;
begin
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Profile unavailable' using errcode = 'P0002'; end if;
  select * into existing from public.property_analyses where id = p_id;
  if found then
    if existing.user_id <> p_user_id or existing.snapshot <> p_snapshot then
      raise exception 'Snapshot ID already used' using errcode = '23505';
    end if;
    return jsonb_build_object('id', existing.id, 'created_at', existing.created_at, 'snapshot', existing.snapshot);
  end if;
  if (select count(*) from public.property_analyses where user_id = p_user_id) >= 200 then
    raise exception 'Analysis storage limit reached' using errcode = 'P0001';
  end if;
  insert into public.property_analyses(id, user_id, snapshot) values(p_id, p_user_id, p_snapshot) returning * into saved;
  return jsonb_build_object('id', saved.id, 'created_at', saved.created_at, 'snapshot', saved.snapshot);
end;
$$;
revoke all on function public.save_property_analysis(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_property_analysis(uuid, uuid, jsonb) to service_role;
