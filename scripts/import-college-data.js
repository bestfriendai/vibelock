const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// College Scorecard API configuration
const COLLEGE_SCORECARD_API_KEY = 'B2QoBnDDsR5fJfwPeaZuie95ecS3APrL707HNRvr';
const API_BASE_URL = 'https://api.data.gov/ed/collegescorecard/v1/schools';

/**
 * Load US colleges from the comprehensive dataset
 */
async function loadUSCollegesFromDataset() {
  const fs = require('fs');
  const path = require('path');

  try {
    const dataPath = path.join(__dirname, '../us-colleges-and-universities@public.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const allColleges = JSON.parse(rawData);

    // Filter for active institutions with valid data
    const validColleges = allColleges.filter(college =>
      college.name &&
      college.name.trim().length > 0 &&
      college.city &&
      college.state &&
      college.status === 'A' && // Active status
      college.country === 'USA' // US only
    );

    console.log(`Found ${validColleges.length} active US colleges/universities in dataset`);
    return validColleges;
  } catch (error) {
    console.error('Error loading college dataset:', error);
    return [];
  }
}

/**
 * Transform college dataset to our database format
 */
function transformCollegeData(collegeData) {
  const colleges = [];

  for (const college of collegeData) {
    // Skip schools with missing essential data
    if (!college.name || !college.name.trim() || !college.city || !college.state) {
      continue;
    }

    // Extract coordinates if available
    let coordinates = null;
    if (college.latitude && college.longitude) {
      coordinates = {
        latitude: parseFloat(college.latitude),
        longitude: parseFloat(college.longitude)
      };
    }

    // Determine institution type based on NAICS code and name patterns
    let institutionType = 'university';
    const name = college.name.toLowerCase();
    const naicsCode = college.naics_code;

    if (naicsCode === '611210' || name.includes('community college') || name.includes('junior college')) {
      institutionType = 'community_college';
    } else if (naicsCode === '611511' || name.includes('beauty') || name.includes('cosmetology') || name.includes('barber')) {
      institutionType = 'trade_school';
    } else if (naicsCode === '611519' || name.includes('technical') || name.includes('trade') || name.includes('career center')) {
      institutionType = 'trade_school';
    } else if (name.includes('college') && !name.includes('university')) {
      institutionType = 'college';
    } else if (name.includes('institute') || name.includes('school')) {
      institutionType = 'college';
    }

    colleges.push({
      name: college.name.trim(),
      city: college.city.trim(),
      state: college.state.trim().toUpperCase(),
      coordinates: coordinates,
      institution_type: institutionType,
      alias: college.alias && college.alias !== 'NOT AVAILABLE' ? college.alias.trim() : null,
      scorecard_id: college.ipedsid ? parseInt(college.ipedsid) : null
    });
  }

  return colleges;
}



/**
 * Insert colleges into Supabase in batches
 */
async function insertColleges(colleges) {
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < colleges.length; i += batchSize) {
    const batch = colleges.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('colleges')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        errors += batch.length;
      } else {
        inserted += data?.length || 0;
        console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${data?.length || 0} colleges`);
      }
    } catch (err) {
      console.error(`Exception inserting batch ${Math.floor(i / batchSize) + 1}:`, err);
      errors += batch.length;
    }
  }

  return { inserted, errors };
}

/**
 * Main import function
 */
async function importCollegeData() {
  console.log('🎓 Starting College Data Import...\n');

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing college data...');
    const { error: deleteError } = await supabase
      .from('colleges')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error clearing existing data:', deleteError);
    } else {
      console.log('✅ Existing data cleared\n');
    }

    // Load data from local dataset
    console.log('📚 Loading US college data from dataset...');
    const universityData = await loadUSCollegesFromDataset();

    if (universityData.length === 0) {
      console.log('❌ No data loaded from dataset. Exiting...');
      return;
    }

    console.log(`✅ Loaded ${universityData.length} US universities from dataset\n`);

    // Transform data
    console.log('🔄 Transforming college data...');
    const allColleges = transformCollegeData(universityData);
    console.log(`✅ Transformed ${allColleges.length} colleges\n`);

    // Show sample of transformed data
    console.log('📋 Sample of transformed data:');
    console.log(JSON.stringify(allColleges.slice(0, 3), null, 2));
    console.log('...\n');

    console.log(`\n📈 Total colleges to import: ${allColleges.length}`);

    // Insert all colleges
    const { inserted, errors } = await insertColleges(allColleges);

    console.log('\n🎉 Import Complete!');
    console.log(`✅ Successfully imported: ${inserted} colleges`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Success rate: ${((inserted / (inserted + errors)) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  }
}

// Run the import
if (require.main === module) {
  importCollegeData();
}

module.exports = { importCollegeData, loadUSCollegesFromDataset, transformCollegeData };
