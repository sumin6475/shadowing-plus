// One-shot wipe of the old Vibe-era data. Run with:
//   node --env-file=.env.local scripts/wipe-supabase.mjs
// Schema migration (DROP/CREATE) is applied separately via SQL editor.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function tryDelete(table) {
  // Delete-all by an always-true filter; PostgREST refuses unfiltered DELETE.
  const { error, count } = await sb
    .from(table)
    .delete({ count: "exact" })
    .gt("created_at", "1970-01-01");
  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      console.log(`  ${table}: table not present (skipping)`);
      return;
    }
    console.log(`  ${table}: ERR ${error.message}`);
  } else {
    console.log(`  ${table}: deleted ${count ?? 0} rows`);
  }
}

async function emptyBucket(bucket) {
  const { data, error } = await sb.storage.from(bucket).list("", {
    limit: 1000,
  });
  if (error) {
    console.log(`  storage/${bucket}: list err ${error.message}`);
    return;
  }
  const collectNames = async (prefix, names) => {
    const { data: items } = await sb.storage.from(bucket).list(prefix, {
      limit: 1000,
    });
    if (!items) return;
    for (const item of items) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        await collectNames(full, names);
      } else {
        names.push(full);
      }
    }
  };
  const names = [];
  await collectNames("", names);
  if (names.length === 0) {
    console.log(`  storage/${bucket}: already empty`);
    return;
  }
  const { error: rmErr } = await sb.storage.from(bucket).remove(names);
  if (rmErr) {
    console.log(`  storage/${bucket}: rm err ${rmErr.message}`);
  } else {
    console.log(`  storage/${bucket}: removed ${names.length} objects`);
  }
}

console.log("Wiping data tables:");
for (const t of ["bookmarks", "segments", "videos", "folders", "jobs"]) {
  await tryDelete(t);
}
console.log("Wiping storage:");
for (const b of ["audio"]) {
  await emptyBucket(b);
}
console.log("Done.");
