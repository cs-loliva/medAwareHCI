-- Schema health check helper view for admin diagnostics.
create or replace view public.schema_health_check as
select
  t.table_schema,
  t.table_name,
  case
    when p.policy_count > 0 then 'healthy'
    else 'warning'
  end as status,
  coalesce(p.policy_count, 0) as policy_count
from information_schema.tables t
left join (
  select schemaname, tablename, count(*)::int as policy_count
  from pg_policies
  group by schemaname, tablename
) p
  on p.schemaname = t.table_schema
 and p.tablename = t.table_name
where t.table_type = 'BASE TABLE'
  and t.table_schema = 'public';
