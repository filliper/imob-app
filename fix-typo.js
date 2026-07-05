const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envBuffer = fs.readFileSync(envPath, 'utf8');
  const lines = envBuffer.split('\n');
  lines.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      // Remove quotes if present
      process.env[key] = value.replace(/^['"]|['"]$/g, '');
    }
  });
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixTypo() {
  try {
    // First, let's see what we have
    const { data: properties, error: selectError } = await supabase
      .from('properties')
      .select('id, name')
      .ilike('name', '%Cantro%');

    if (selectError) {
      console.error('Error fetching properties:', selectError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('No properties found with "Cantro" in the name.');
      return;
    }

    console.log(`Found ${properties.length} property(ies) with "Cantro":`);
    properties.forEach(p => {
      console.log(`  ID: ${p.id}, Name: "${p.name}"`);
    });

    // Update each property: replace 'Cantro' with 'Centro'
    for (const property of properties) {
      const newName = property.name.replace(/Cantro/g, 'Centro');
      const { error: updateError } = await supabase
        .from('properties')
        .update({ name: newName })
        .eq('id', property.id);

      if (updateError) {
        console.error(`Error updating property ${property.id}:`, updateError);
      } else {
        console.log(`Updated property ${property.id}: "${property.name}" -> "${newName}"`);
      }
    }

    console.log('Typo fix completed.');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

fixTypo();