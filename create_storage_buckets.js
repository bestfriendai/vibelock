// Script to create storage buckets using Supabase client
// Run this with: node create_storage_buckets.js

const { createClient } = require("@supabase/supabase-js");

// Your Supabase credentials from .env
const supabaseUrl = "https://dqjhwqhelqwhvtpxccwj.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // You'll need to set this

if (!supabaseServiceKey) {
  console.error("❌ SUPABASE_SERVICE_KEY environment variable is required");
  console.log("Get your service key from: https://supabase.com/dashboard/project/dqjhwqhelqwhvtpxccwj/settings/api");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createStorageBuckets() {
  console.log("🗄️ Creating storage buckets...");

  const buckets = [
    {
      id: "avatars",
      name: "avatars",
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    },
    {
      id: "review-images",
      name: "review-images",
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/x-msvideo"],
    },
    {
      id: "chat-media",
      name: "chat-media",
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/quicktime",
        "audio/mpeg",
        "audio/wav",
        "audio/m4a",
      ],
    },
    {
      id: "documents",
      name: "documents",
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    },
  ];

  for (const bucket of buckets) {
    try {
      console.log(`Creating bucket: ${bucket.id}...`);

      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });

      if (error) {
        if (error.message.includes("already exists")) {
          console.log(`✅ Bucket ${bucket.id} already exists`);
        } else {
          console.error(`❌ Error creating bucket ${bucket.id}:`, error.message);
        }
      } else {
        console.log(`✅ Created bucket: ${bucket.id}`);
      }
    } catch (err) {
      console.error(`💥 Failed to create bucket ${bucket.id}:`, err.message);
    }
  }

  console.log("\n🎉 Storage bucket creation completed!");
  console.log("\n📋 Next steps:");
  console.log("1. Go to Supabase Dashboard > Storage > Policies");
  console.log("2. Create policies for each bucket using the policy definitions in storage_policies_individual.sql");
  console.log("3. Test storage upload in your app");
}

createStorageBuckets().catch(console.error);
