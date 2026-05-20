alter table public.medications
  add column if not exists rxcui text,
  add column if not exists normalized_name text,
  add column if not exists normalization_source text,
  add column if not exists normalization_confidence text,
  add column if not exists safety_evidence jsonb default '[]'::jsonb,
  add column if not exists safety_checked_at timestamptz;
