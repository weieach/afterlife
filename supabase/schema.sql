-- Survey responses table for ∞ Underworld Supply Co..
--
-- Run once: Supabase dashboard → SQL Editor → New query → paste this file → Run.
-- Then copy the Project URL and the anon / publishable key into survey/config.js.
--
-- Who can do what with the public (anon) key that ships in the website:
--   * insert a response
--   * read the responses whose author agreed to publish them (publish), and of those only the
--     picks (without the reasons, if they chose to keep those private), the nickname they chose,
--     and when they were sent. The survey answers (age, heritage, where they live, …),
--     the sharing choices and thoughts are never shown alongside the picks: they show only in
--     your dashboard.
--   * nothing else: no updates, no deletes
-- You see everything, name and contact included, under Table Editor → submissions.

create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lang        text check (lang in ('en', 'zh')),

  -- [{ id, en, zh, custom, variation, reason }, ...] — id is "other" for write-ins
  picks       jsonb not null check (
                jsonb_typeof(picks) = 'array'
                and jsonb_array_length(picks) between 1 and 5
                and length(picks::text) < 10000
              ),

  age         text check (length(age) <= 20),
  heritage    text[] check (cardinality(heritage) <= 4),
  nationality text check (length(nationality) <= 200), -- older responses only (no longer asked)
  residence   text check (length(residence) <= 40),
  country     text check (length(country) <= 200), -- where abroad, when residence is overseas
  burning     text check (length(burning) <= 20), -- every-year / occasionally / tried-before / never
  afterlife   text check (length(afterlife) <= 4000), -- what they believe happens after we die

  -- the last page: show on the public results page? (null on older responses: shown)
  publish     boolean,
  nickname    text check (length(nickname) <= 60), -- shown with their list in the gallery

  -- private: never readable with the public key
  name        text check (length(name) <= 200),
  contact     text check (length(contact) <= 300),
  share_custom boolean, -- may their custom items join the selection? (null: they had none)
  show_reasons boolean, -- were their reasons kept in picks (public)? if not, they're in reasons
  reasons     jsonb check (jsonb_typeof(reasons) = 'array' and length(reasons::text) < 10000), -- private, in pick order
  thoughts    text check (length(thoughts) <= 4000)
);

-- Added after the table was first created; safe to re-run.
alter table public.submissions
  add column if not exists burning text check (length(burning) <= 20),
  add column if not exists afterlife text check (length(afterlife) <= 4000),
  add column if not exists publish boolean,
  add column if not exists country text check (length(country) <= 200),
  add column if not exists nickname text check (length(nickname) <= 60),
  add column if not exists show_reasons boolean,
  add column if not exists reasons jsonb check (jsonb_typeof(reasons) = 'array' and length(reasons::text) < 10000),
  add column if not exists share_custom boolean,
  add column if not exists thoughts text check (length(thoughts) <= 4000);

alter table public.submissions enable row level security;

drop policy if exists "Anyone can submit" on public.submissions;
create policy "Anyone can submit" on public.submissions
  for insert to anon, authenticated
  with check (true);

drop policy if exists "Anyone can read responses" on public.submissions;
drop policy if exists "Anyone can read published responses" on public.submissions;
create policy "Anyone can read published responses" on public.submissions
  for select to anon, authenticated
  using (publish is not false);

-- Column-level access: the results page can read these columns only.
revoke select on public.submissions from anon, authenticated;
grant select (id, created_at, lang, picks, publish, nickname)
  on public.submissions to anon, authenticated;
grant insert on public.submissions to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Custom items, for review.
--
-- Every write-in (a pick typed in with "Add …") is copied here, one row per item, the moment
-- its response arrives. Review them under Table Editor → custom_items: set `status` to
-- 'added' once you've put the item into the main selection (content/en.js, zh.js and a cutout),
-- or 'declined'. `may_add` is the person's own answer to "Add my custom items to the selection".
-- The view custom_item_names groups the same name typed by different people.
--
-- Private: the public key can't read or change any of this. Safe to re-run; re-running also
-- copies in write-ins from responses sent before this table existed.

create table if not exists public.custom_items (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  pick_no       smallint not null, -- which of the person's picks (1-5)
  name          text not null,
  variation     text,
  reason        text,
  may_add       boolean, -- did the person agree to it joining the selection?
  status        text not null default 'pending' check (status in ('pending', 'added', 'declined')),
  note          text, -- yours
  unique (submission_id, pick_no)
);

alter table public.custom_items enable row level security; -- no policies: closed to the public key
revoke all on public.custom_items from anon, authenticated;

create or replace function public.copy_custom_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.custom_items (submission_id, created_at, pick_no, name, variation, reason, may_add)
  select new.id, new.created_at, p.ord::smallint,
         left(trim(p.pick->>'custom'), 200),
         nullif(trim(p.pick->>'variation'), ''),
         nullif(trim(p.pick->>'reason'), ''),
         new.share_custom
  from jsonb_array_elements(new.picks) with ordinality as p(pick, ord)
  where p.pick->>'id' = 'other' and coalesce(trim(p.pick->>'custom'), '') <> ''
  on conflict (submission_id, pick_no) do nothing;
  return new;
end;
$$;
revoke all on function public.copy_custom_items() from public, anon, authenticated;

drop trigger if exists copy_custom_items on public.submissions;
create trigger copy_custom_items
  after insert on public.submissions
  for each row execute function public.copy_custom_items();

-- write-ins already in submissions
insert into public.custom_items (submission_id, created_at, pick_no, name, variation, reason, may_add)
select s.id, s.created_at, p.ord::smallint,
       left(trim(p.pick->>'custom'), 200),
       nullif(trim(p.pick->>'variation'), ''),
       nullif(trim(p.pick->>'reason'), ''),
       s.share_custom
from public.submissions s,
     jsonb_array_elements(s.picks) with ordinality as p(pick, ord)
where p.pick->>'id' = 'other' and coalesce(trim(p.pick->>'custom'), '') <> ''
on conflict (submission_id, pick_no) do nothing;

-- one line per name (ignoring case and spacing): how many people typed it, how many said it may join
create or replace view public.custom_item_names
with (security_invoker = true) as
select lower(regexp_replace(trim(name), '\s+', ' ', 'g')) as name_key,
       min(name)                                     as name,
       count(*)                                      as times,
       count(*) filter (where may_add)               as may_add,
       count(*) filter (where status = 'pending')    as pending,
       max(created_at)                               as last_seen
from public.custom_items
group by 1
order by times desc, last_seen desc;
revoke all on public.custom_item_names from anon, authenticated;
