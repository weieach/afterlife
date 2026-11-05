/*
 * Saving and reading survey responses (used by index.html and results.html).
 * Talks to Supabase when config.js is filled in; otherwise keeps responses in this
 * browser's localStorage so both pages still work while testing.
 */
window.SURVEY_DB = (() => {
  'use strict';

  const { supabaseUrl, supabaseKey } = window.SURVEY_CONFIG || {};
  const configured = !!(supabaseUrl && supabaseKey);
  const client = configured && window.supabase
    ? window.supabase.createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

  const TABLE = 'submissions';
  const PUBLIC_COLUMNS = 'id, created_at, lang, picks, nickname'; // the survey answers are never shown with the picks
  const LOCAL_KEY = 'afterlife-survey-submissions'; // responses, when there's no database
  const MINE_KEY = 'afterlife-survey-mine'; // ids sent from this browser, to mark them on the results page

  function readLocal(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; }
  }

  function pushLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify([...readLocal(key), value])); } catch (_) { /* storage unavailable */ }
  }

  // Made here rather than by the database, so this browser can recognise its own response.
  function newId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16)); // randomUUID needs https or localhost
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  // row: { id, lang, picks, age, heritage, residence, country, burning,
  //        nickname, publish, show_reasons, reasons, share_custom, thoughts }
  async function save(row) {
    if (configured) {
      if (!client) throw new Error('Supabase library failed to load');
      const { error } = await client.from(TABLE).insert(row);
      if (error) throw error;
    } else {
      pushLocal(LOCAL_KEY, { ...row, created_at: new Date().toISOString() });
    }
    pushLocal(MINE_KEY, row.id);
  }

  // Newest first: only the ones people agreed to show (the database's own rules do this there),
  // and without anything private.
  async function list() {
    if (!configured) {
      return readLocal(LOCAL_KEY)
        .filter((r) => r.publish !== false)
        .map(({ id, created_at, lang, picks, nickname }) => ({ id, created_at, lang, picks, nickname }))
        .reverse();
    }
    if (!client) throw new Error('Supabase library failed to load');
    const query = (columns) => client.from(TABLE)
      .select(columns)
      .order('created_at', { ascending: false })
      .limit(2000);
    let { data, error } = await query(PUBLIC_COLUMNS);
    // a database not yet updated from schema.sql has no nickname column: the lists still show
    if (error?.code === '42703') ({ data, error } = await query(PUBLIC_COLUMNS.replace(', nickname', '')));
    if (error) throw error;
    return data;
  }

  return { save, list, newId, configured, mine: () => new Set(readLocal(MINE_KEY)) };
})();
