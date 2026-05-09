// scripts/retroactive-sync.ts
// Run once after deploying member lifecycle feature:
//   npx ts-node --project tsconfig.json scripts/retroactive-sync.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log('Fetching all signups...');
  const { data: signups, error } = await supabase
    .from('signups')
    .select('name, membership_date')
    .order('membership_date', { ascending: true }); // oldest first so newest wins

  if (error) {
    console.error('Failed to fetch signups:', error.message);
    process.exit(1);
  }

  console.log(`Processing ${signups?.length ?? 0} signups...`);
  let updated = 0;
  let skipped = 0;

  for (const signup of signups ?? []) {
    if (!signup.name) {
      continue;
    }

    const { data: intro } = await supabase
      .from('intros')
      .select('id, name, signed_up')
      .ilike('name', signup.name.toLowerCase().trim())
      .order('date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!intro || intro.signed_up === 'Yes') {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('intros')
      .update({ signed_up: 'Yes' })
      .eq('id', intro.id);

    if (updateError) {
      console.error(`Failed to update intro for ${signup.name}:`, updateError.message);
    } else {
      console.log(`  ✓ Marked intro for "${intro.name}" (${intro.id}) as signed_up=Yes`);
      updated++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

run().catch(console.error);
