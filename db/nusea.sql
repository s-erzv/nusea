-- NUSEA private store. Lives in its own schema inside the shared Neon project
-- (nuzas-office), so it cannot collide with that app's public tables.

create schema if not exists nusea;

create table if not exists nusea.documents (
  entity text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  constraint documents_entity_check check (
    entity in (
      'profile',
      'items',
      'assets',
      'venues',
      'sources',
      'grants',
      'ideas',
      'tasks',
      'history'
    )
  )
);

create table if not exists nusea.document_backups (
  id bigint generated always as identity primary key,
  entity text not null,
  value jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists document_backups_entity_created_idx
  on nusea.document_backups (entity, created_at desc, id desc);

alter table nusea.documents enable row level security;
alter table nusea.document_backups enable row level security;

revoke all on schema nusea from anon, authenticated;
revoke all on nusea.documents, nusea.document_backups from anon, authenticated;
revoke all on all sequences in schema nusea from anon, authenticated;

-- Public projections for read-only consumers (nupers-week). Only published,
-- public-visibility records and allowlisted columns leave the private store.
drop view if exists nusea.public_research;
create or replace view nusea.public_research with (security_invoker = false) as
select
  item ->> 'id' as id,
  nullif(item ->> 'createdAt', '') as created_at,
  nullif(item ->> 'updatedAt', '') as updated_at,
  item ->> 'title' as title,
  item ->> 'type' as type,
  item ->> 'status' as status,
  item ->> 'abstract' as abstract,
  item -> 'keywords' as keywords,
  item -> 'authors' as authors,
  item ->> 'venueId' as venue_id,
  nullif(item ->> 'submittedAt', '') as submitted_at,
  nullif(item ->> 'decisionAt', '') as decision_at,
  nullif(item ->> 'publishedAt', '') as published_at,
  nullif(item ->> 'doi', '') as doi,
  nullif(item ->> 'publicUrl', '') as public_url,
  coalesce((item ->> 'pinned')::boolean, false) as pinned
from nusea.documents d
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(d.value) = 'array' then d.value else '[]'::jsonb end
) as item
where d.entity = 'items'
  and item ->> 'visibility' = 'public';

drop view if exists nusea.public_venues;
create or replace view nusea.public_venues with (security_invoker = false) as
select
  venue ->> 'id' as id,
  nullif(venue ->> 'createdAt', '') as created_at,
  nullif(venue ->> 'updatedAt', '') as updated_at,
  venue ->> 'name' as name,
  venue ->> 'kind' as kind,
  venue ->> 'indexLevel' as index_level,
  nullif(venue ->> 'url', '') as url,
  case when (venue ->> 'typicalReviewWeeks') ~ '^[0-9]+$' then (venue ->> 'typicalReviewWeeks')::integer else null end as typical_review_weeks
from nusea.documents d
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(d.value) = 'array' then d.value else '[]'::jsonb end
) as venue
where d.entity = 'venues'
  and venue ->> 'visibility' = 'public';

-- Scholar profile (separate from the portfolio's public_profile view).
create or replace view nusea.public_scholar_profile with (security_invoker = false) as
select
  p.profile ->> 'id' as id,
  nullif(p.profile ->> 'createdAt', '') as created_at,
  nullif(p.profile ->> 'updatedAt', '') as updated_at,
  p.profile ->> 'name' as name,
  p.profile ->> 'handle' as handle,
  p.profile ->> 'campus' as campus,
  p.profile ->> 'studyProgram' as study_program,
  p.profile ->> 'tagline' as tagline,
  p.profile ->> 'bio' as bio,
  p.profile ->> 'avatar' as avatar,
  p.profile -> 'socials' as socials
from nusea.documents d
cross join lateral (
  select case when jsonb_typeof(d.value) = 'object' then d.value else '{}'::jsonb end as profile
) as p
where d.entity = 'profile'
  and d.value ->> 'visibility' = 'public';

create or replace view nusea.public_assets with (security_invoker = false) as
select
  asset ->> 'id' as id,
  nullif(asset ->> 'createdAt', '') as created_at,
  nullif(asset ->> 'updatedAt', '') as updated_at,
  asset ->> 'kind' as kind,
  asset ->> 'label' as label,
  nullif(asset ->> 'url', '') as url,
  coalesce((
    select jsonb_agg(x.id)
    from jsonb_array_elements_text(coalesce(asset -> 'itemIds', '[]'::jsonb)) as x(id)
    where exists (
      select 1
      from nusea.documents di
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(di.value) = 'array' then di.value else '[]'::jsonb end
      ) as pi
      where di.entity = 'items'
        and pi ->> 'id' = x.id
        and pi ->> 'visibility' = 'public'
    )
  ), '[]'::jsonb) as research_ids,
  asset -> 'tags' as tags,
  coalesce((asset ->> 'isPrimary')::boolean, false) as is_primary
from nusea.documents d
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(d.value) = 'array' then d.value else '[]'::jsonb end
) as asset
where d.entity = 'assets'
  and asset ->> 'visibility' = 'public';

create or replace view nusea.public_grants with (security_invoker = false) as
select
  g ->> 'id' as id,
  nullif(g ->> 'createdAt', '') as created_at,
  nullif(g ->> 'updatedAt', '') as updated_at,
  g ->> 'scheme' as scheme,
  g ->> 'cluster' as cluster,
  nullif(g ->> 'proposalDeadline', '') as proposal_deadline,
  g ->> 'selectionStage' as selection_stage,
  g -> 'requiredOutputs' as required_outputs,
  nullif(g ->> 'outputDeadline', '') as output_deadline
from nusea.documents d
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(d.value) = 'array' then d.value else '[]'::jsonb end
) as g
where d.entity = 'grants'
  and g ->> 'visibility' = 'public';

create or replace view nusea.public_ideas with (security_invoker = false) as
select
  i ->> 'id' as id,
  nullif(i ->> 'createdAt', '') as created_at,
  nullif(i ->> 'updatedAt', '') as updated_at,
  i ->> 'title' as title,
  i ->> 'problem' as problem,
  i ->> 'whyOnChain' as why_on_chain,
  i ->> 'cluster' as cluster,
  i -> 'scores' as scores,
  i ->> 'status' as status
from nusea.documents d
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(d.value) = 'array' then d.value else '[]'::jsonb end
) as i
where d.entity = 'ideas'
  and i ->> 'visibility' = 'public';

revoke all on nusea.public_research, nusea.public_venues, nusea.public_scholar_profile,
  nusea.public_assets, nusea.public_grants, nusea.public_ideas from anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'nusea_web') then
    execute 'grant select on nusea.public_research, nusea.public_venues, nusea.public_scholar_profile, nusea.public_assets, nusea.public_grants, nusea.public_ideas to nusea_web';
  end if;
end $$;



-- ---------------------------------------------------------------------------
-- Portfolio content for nupers-week (projects, experience, skills, profile).
-- Written by Alden from Telegram; read by the public API through the views.
-- ---------------------------------------------------------------------------
create table if not exists nusea.portfolio_projects (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  featured boolean not null default false,
  sort integer not null default 0,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists nusea.portfolio_experience (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  sort integer not null default 0,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists nusea.portfolio_skills (
  name text primary key,
  skill_group text not null check (skill_group in ('front', 'back', 'chain', 'tools')),
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists nusea.portfolio_profile (
  id text primary key default 'profile' check (id = 'profile'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

alter table nusea.portfolio_projects enable row level security;
alter table nusea.portfolio_experience enable row level security;
alter table nusea.portfolio_skills enable row level security;
alter table nusea.portfolio_profile enable row level security;

revoke all on nusea.portfolio_projects, nusea.portfolio_experience,
  nusea.portfolio_skills, nusea.portfolio_profile from anon, authenticated;

create or replace view nusea.public_projects as
select slug, featured, sort, data from nusea.portfolio_projects;

create or replace view nusea.public_experience as
select id, sort, data from nusea.portfolio_experience;

create or replace view nusea.public_skills as
select name, skill_group, sort from nusea.portfolio_skills;

create or replace view nusea.public_profile as
select data from nusea.portfolio_profile where id = 'profile';

revoke all on nusea.public_projects, nusea.public_experience,
  nusea.public_skills, nusea.public_profile from anon, authenticated;

-- Reader role for public sites (password is set out of band):
--   create role nusea_web login password '...';
--   grant connect on database neondb to nusea_web;
--   grant usage on schema nusea to nusea_web;
--   grant select on nusea.public_research, nusea.public_venues,
--     nusea.public_projects, nusea.public_experience,
--     nusea.public_skills, nusea.public_profile to nusea_web;
--   revoke all on nusea.documents, nusea.document_backups from nusea_web;
