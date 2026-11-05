/*
 * Supabase connection — where survey responses are saved.
 *
 * 1. Create a project at supabase.com and run ../supabase/schema.sql in its SQL Editor.
 * 2. Project Settings → API: copy the Project URL and the anon (or publishable) key here.
 *
 * The anon key is meant to be public; schema.sql limits it to adding responses and
 * reading them back without names or contact details. Never put the service_role
 * (secret) key here.
 *
 * Left empty, responses are kept in this browser only — fine for testing the pages.
 */
window.SURVEY_CONFIG = {
  supabaseUrl: 'https://fkedjqgaqmdpapryaqpc.supabase.co', // e.g. 'https://abcdefghijkl.supabase.co'
  supabaseKey: 'sb_publishable_z2DBzV3js6SZP7NI_9Tu2Q_ITuppSIk',
};
