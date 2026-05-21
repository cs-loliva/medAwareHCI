create or replace function public.get_schema_health()
returns table (
  table_name text,
  column_name text,
  expected_type text,
  exists boolean
)
language sql
security definer
set search_path = public
as $$
  with required_columns(table_name, column_name, expected_type) as (
    values
      ('profiles', 'id', 'uuid'),
      ('profiles', 'full_name', 'text'),
      ('profiles', 'email', 'text'),
      ('profiles', 'first_name', 'text'),
      ('profiles', 'last_name', 'text'),
      ('profiles', 'avatar_url', 'text'),
      ('profiles', 'profile_completed', 'boolean'),
      ('profiles', 'auth_provider', 'text'),
      ('profiles', 'updated_at', 'timestamp with time zone'),

      ('medications', 'id', 'uuid'),
      ('medications', 'user_id', 'uuid'),
      ('medications', 'name', 'text'),
      ('medications', 'dose_amount', 'numeric'),
      ('medications', 'dose_unit', 'text'),
      ('medications', 'frequency', 'text'),
      ('medications', 'status', 'text'),
      ('medications', 'rxcui', 'text'),
      ('medications', 'normalized_name', 'text'),
      ('medications', 'normalization_source', 'text'),
      ('medications', 'normalization_confidence', 'text'),
      ('medications', 'safety_evidence', 'jsonb'),
      ('medications', 'safety_checked_at', 'timestamp with time zone'),
      ('medications', 'updated_at', 'timestamp with time zone'),

      ('medication_schedules', 'id', 'uuid'),
      ('medication_schedules', 'medication_id', 'uuid'),
      ('medication_schedules', 'scheduled_time', 'time without time zone'),
      ('medication_schedules', 'day_of_week', 'integer'),

      ('medication_alerts', 'id', 'uuid'),
      ('medication_alerts', 'user_id', 'uuid'),
      ('medication_alerts', 'severity', 'text'),
      ('medication_alerts', 'description', 'text'),
      ('medication_alerts', 'status', 'text'),

      ('notifications', 'id', 'uuid'),
      ('notifications', 'user_id', 'uuid'),
      ('notifications', 'title', 'text'),
      ('notifications', 'body', 'text'),
      ('notifications', 'type', 'text'),
      ('notifications', 'href', 'text'),
      ('notifications', 'read_at', 'timestamp with time zone'),
      ('notifications', 'created_at', 'timestamp with time zone'),

      ('audit_logs', 'id', 'uuid'),
      ('audit_logs', 'actor_id', 'uuid'),
      ('audit_logs', 'action', 'text'),
      ('audit_logs', 'target_type', 'text'),
      ('audit_logs', 'target_id', 'uuid'),
      ('audit_logs', 'metadata', 'jsonb'),
      ('audit_logs', 'created_at', 'timestamp with time zone'),

      ('roles', 'id', 'uuid'),
      ('roles', 'name', 'text'),

      ('user_roles', 'user_id', 'uuid'),
      ('user_roles', 'role_id', 'uuid')
  )
  select
    required_columns.table_name,
    required_columns.column_name,
    required_columns.expected_type,
    exists (
      select 1
      from information_schema.columns columns
      where columns.table_schema = 'public'
        and columns.table_name = required_columns.table_name
        and columns.column_name = required_columns.column_name
    ) as exists
  from required_columns
  order by required_columns.table_name, required_columns.column_name;
$$;
