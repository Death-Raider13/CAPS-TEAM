require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('Create a .env file in the backend folder with:');
  console.error('SUPABASE_URL=your-project-url');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Adjust this path if your drafts file is named differently or in a different folder
  const draftsPath = path.resolve(__dirname, '../drafts.json');

  if (!fs.existsSync(draftsPath)) {
    console.error('Could not find drafts.json at', draftsPath);
    console.error('Copy your drafts file next to package.json (project root) and name it drafts.json');
    process.exit(1);
  }

  const raw = fs.readFileSync(draftsPath, 'utf8');
  const drafts = JSON.parse(raw);

  if (!Array.isArray(drafts)) {
    console.error('Expected drafts.json to contain an array');
    process.exit(1);
  }

  console.log(`Found ${drafts.length} drafts to migrate...`);

  const batchSize = 5;

  for (let i = 0; i < drafts.length; i += batchSize) {
    const slice = drafts.slice(i, i + batchSize);

    const rows = slice.map((d) => ({
      id: d.id,
      report_number: d.reportNumber || null,
      district: d.district || null,
      cap_practitioner: d.capPractitioner || null,
      address_of_infraction: d.addressOfInfraction || null,
      nearest_landmark: d.nearestLandmark || null,
      gps_coordinates: d.gpsCoordinates || null,
      date_of_identification: d.dateOfIdentification || null,
      number_of_floors: d.numberOfFloors || null,
      stage_of_work: d.stageOfWork || null,
      state_of_building: d.stateOfBuilding || null,
      observations_rich_text: d.observationsRichText || null,
      executive_summary: d.executiveSummary || null,
      site_location: d.siteLocation || null,
      type_of_building: d.typeOfBuilding || null,
      recommendation_status: d.recommendationStatus || null,
      challenges_and_limitations: d.challengesAndLimitations || null,
      photos: d.photos || [],
      saved_at: d.savedAt ? new Date(d.savedAt).toISOString() : null,
    }));

    const { error } = await supabase
      .from('drafts')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting batch starting at index', i, error);
      process.exit(1);
    }

    console.log(`Migrated drafts ${i + 1}-${Math.min(i + batchSize, drafts.length)}`);
  }

  console.log('Migration completed successfully');
}

main().catch((err) => {
  console.error('Unexpected error during migration:', err);
  process.exit(1);
});
