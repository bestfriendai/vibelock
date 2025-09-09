const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase client
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// Major US cities with coordinates
const MAJOR_CITIES = [
  { city: "New York", state: "NY", lat: 40.7128, lng: -74.006 },
  { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
  { city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298 },
  { city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698 },
  { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074 },
  { city: "Philadelphia", state: "PA", lat: 39.9526, lng: -75.1652 },
  { city: "San Antonio", state: "TX", lat: 29.4241, lng: -98.4936 },
  { city: "San Diego", state: "CA", lat: 32.7157, lng: -117.1611 },
  { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797 },
  { city: "San Jose", state: "CA", lat: 37.3382, lng: -121.8863 },
  { city: "Austin", state: "TX", lat: 30.2672, lng: -97.7431 },
  { city: "Jacksonville", state: "FL", lat: 30.3322, lng: -81.6557 },
  { city: "Fort Worth", state: "TX", lat: 32.7555, lng: -97.3308 },
  { city: "Columbus", state: "OH", lat: 39.9612, lng: -82.9988 },
  { city: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431 },
  { city: "San Francisco", state: "CA", lat: 37.7749, lng: -122.4194 },
  { city: "Indianapolis", state: "IN", lat: 39.7684, lng: -86.1581 },
  { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
  { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903 },
  { city: "Washington", state: "DC", lat: 38.9072, lng: -77.0369 },
  { city: "Boston", state: "MA", lat: 42.3601, lng: -71.0589 },
  { city: "El Paso", state: "TX", lat: 31.7619, lng: -106.485 },
  { city: "Nashville", state: "TN", lat: 36.1627, lng: -86.7816 },
  { city: "Detroit", state: "MI", lat: 42.3314, lng: -83.0458 },
  { city: "Oklahoma City", state: "OK", lat: 35.4676, lng: -97.5164 },
  { city: "Portland", state: "OR", lat: 45.5152, lng: -122.6784 },
  { city: "Las Vegas", state: "NV", lat: 36.1699, lng: -115.1398 },
  { city: "Memphis", state: "TN", lat: 35.1495, lng: -90.049 },
  { city: "Louisville", state: "KY", lat: 38.2527, lng: -85.7585 },
  { city: "Baltimore", state: "MD", lat: 39.2904, lng: -76.6122 },
  { city: "Milwaukee", state: "WI", lat: 43.0389, lng: -87.9065 },
  { city: "Albuquerque", state: "NM", lat: 35.0844, lng: -106.6504 },
  { city: "Tucson", state: "AZ", lat: 32.2226, lng: -110.9747 },
  { city: "Fresno", state: "CA", lat: 36.7378, lng: -119.7871 },
  { city: "Sacramento", state: "CA", lat: 38.5816, lng: -121.4944 },
  { city: "Mesa", state: "AZ", lat: 33.4152, lng: -111.8315 },
  { city: "Kansas City", state: "MO", lat: 39.0997, lng: -94.5786 },
  { city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388 },
  { city: "Long Beach", state: "CA", lat: 33.7701, lng: -118.1937 },
  { city: "Colorado Springs", state: "CO", lat: 38.8339, lng: -104.8214 },
  { city: "Raleigh", state: "NC", lat: 35.7796, lng: -78.6382 },
  { city: "Miami", state: "FL", lat: 25.7617, lng: -80.1918 },
  { city: "Virginia Beach", state: "VA", lat: 36.8529, lng: -75.978 },
  { city: "Omaha", state: "NE", lat: 41.2565, lng: -95.9345 },
  { city: "Oakland", state: "CA", lat: 37.8044, lng: -122.2712 },
  { city: "Minneapolis", state: "MN", lat: 44.9778, lng: -93.265 },
  { city: "Tulsa", state: "OK", lat: 36.154, lng: -95.9928 },
  { city: "Arlington", state: "TX", lat: 32.7357, lng: -97.1081 },
  { city: "New Orleans", state: "LA", lat: 29.9511, lng: -90.0715 },
  { city: "Wichita", state: "KS", lat: 37.6872, lng: -97.3301 },
  { city: "Cleveland", state: "OH", lat: 41.4993, lng: -81.6944 },
];

// Realistic first names by category
const NAMES = {
  men: [
    "Jake",
    "Tyler",
    "Brandon",
    "Chad",
    "Kyle",
    "Derek",
    "Austin",
    "Connor",
    "Blake",
    "Trevor",
    "Mason",
    "Logan",
    "Hunter",
    "Colton",
    "Garrett",
    "Bryce",
    "Cody",
    "Dustin",
    "Ryan",
    "Kevin",
    "Alex",
    "Jordan",
    "Cameron",
    "Ethan",
    "Noah",
    "Liam",
    "Lucas",
    "Oliver",
    "James",
    "Benjamin",
    "Michael",
    "William",
    "David",
    "Matthew",
    "Daniel",
    "Andrew",
    "Joshua",
    "Christopher",
    "Anthony",
    "Mark",
    "Steven",
    "Paul",
    "Kenneth",
    "Jason",
    "Brian",
    "Scott",
    "Eric",
    "Jonathan",
    "Jacob",
  ],
  women: [
    "Ashley",
    "Jessica",
    "Amanda",
    "Sarah",
    "Brittany",
    "Megan",
    "Jennifer",
    "Nicole",
    "Stephanie",
    "Rachel",
    "Samantha",
    "Kayla",
    "Lauren",
    "Danielle",
    "Heather",
    "Michelle",
    "Kimberly",
    "Amy",
    "Angela",
    "Tiffany",
    "Emma",
    "Olivia",
    "Ava",
    "Isabella",
    "Sophia",
    "Charlotte",
    "Mia",
    "Amelia",
    "Harper",
    "Evelyn",
    "Abigail",
    "Emily",
    "Elizabeth",
    "Mila",
    "Ella",
    "Avery",
    "Sofia",
    "Camila",
    "Aria",
    "Scarlett",
    "Victoria",
    "Madison",
    "Luna",
    "Grace",
    "Chloe",
    "Penelope",
    "Layla",
    "Riley",
    "Zoey",
    "Nora",
  ],
  "lgbtq+": [
    "Alex",
    "Jordan",
    "Casey",
    "Taylor",
    "Morgan",
    "Riley",
    "Avery",
    "Quinn",
    "Sage",
    "River",
    "Phoenix",
    "Rowan",
    "Skylar",
    "Cameron",
    "Blake",
    "Emery",
    "Finley",
    "Hayden",
    "Kai",
    "Lane",
    "Parker",
    "Reese",
    "Sam",
    "Drew",
    "Jamie",
    "Jesse",
    "Kendall",
    "Peyton",
    "Remy",
    "Shay",
    "Adrian",
    "Ash",
    "Bay",
    "Cedar",
    "Dani",
    "Eden",
    "Gray",
    "Indigo",
    "Jules",
    "Kit",
    "Lux",
    "Max",
    "Nova",
    "Ocean",
    "Poet",
    "Rain",
    "Storm",
    "Vale",
    "Winter",
    "Zen",
  ],
};

// Red flags by category with realistic descriptions
const RED_FLAGS_DATA = {
  men: [
    {
      flag: "controlling",
      descriptions: [
        "Constantly checked my phone and got mad when I talked to other people",
        "Tried to control what I wore and who I hung out with",
        "Got jealous of my male friends and made me cut contact with them",
        "Monitored my social media and demanded passwords to my accounts",
      ],
    },
    {
      flag: "dishonest",
      descriptions: [
        "Lied about his job, age, and relationship status",
        "Found out he was married after 3 months of dating",
        "Catfished me with old photos from 5 years ago",
        "Lied about having kids and being divorced",
      ],
    },
    {
      flag: "disrespectful",
      descriptions: [
        "Rude to waitstaff and service workers",
        "Made inappropriate comments about my appearance",
        "Constantly interrupted me and talked over me",
        "Showed up drunk to our dates multiple times",
      ],
    },
    {
      flag: "unreliable",
      descriptions: [
        "Cancelled last minute on almost every date",
        "Never followed through on plans or promises",
        "Always late and never apologized for it",
        "Ghosted me for weeks then acted like nothing happened",
      ],
    },
  ],
  women: [
    {
      flag: "fake",
      descriptions: [
        "Completely different person than her dating profile",
        "Used heavily filtered photos that didn't look like her at all",
        "Lied about her career and education background",
        "Pretended to have interests she clearly knew nothing about",
      ],
    },
    {
      flag: "controlling",
      descriptions: [
        "Got upset when I made plans with friends",
        "Wanted to know where I was 24/7 and who I was with",
        "Tried to change my style and hobbies to match what she liked",
        "Made me feel guilty for having a life outside of her",
      ],
    },
    {
      flag: "dishonest",
      descriptions: [
        "Lied about being single - found out she had a boyfriend",
        "Made up stories about her past that didn't add up",
        "Hid the fact that she had children",
        "Lied about her age by at least 5 years",
      ],
    },
    {
      flag: "rude",
      descriptions: [
        "Extremely rude to restaurant staff and retail workers",
        "Made mean comments about other people's appearances",
        "Constantly on her phone during dates",
        "Never said thank you or showed basic courtesy",
      ],
    },
  ],
  "lgbtq+": [
    {
      flag: "inconsistent",
      descriptions: [
        "Said they wanted something serious but only wanted hookups",
        "Their personality completely changed after a few dates",
        "Gave mixed signals about what they were looking for",
        "Hot and cold behavior - super interested then distant",
      ],
    },
    {
      flag: "dishonest",
      descriptions: [
        "Wasn't honest about their relationship status",
        "Lied about being out to family and friends",
        "Used fake photos that were clearly not them",
        "Misrepresented their identity and what they were looking for",
      ],
    },
    {
      flag: "disrespectful",
      descriptions: [
        "Made inappropriate comments about my identity",
        "Didn't respect my pronouns or boundaries",
        "Was rude to staff and other people around us",
        "Made offensive jokes and comments throughout the date",
      ],
    },
    {
      flag: "unreliable",
      descriptions: [
        "Constantly cancelled plans at the last minute",
        "Never showed up on time for anything",
        "Would disappear for days without explanation",
        "Made promises they never intended to keep",
      ],
    },
  ],
};

// Generate realistic profile images using high-quality photo services
function getProfileImage(category, seed) {
  // High-quality realistic portrait services
  const baseServices = [
    // This Person Does Not Exist - AI generated realistic faces
    `https://thispersondoesnotexist.com/`,
    // Generated Photos - High quality AI portraits
    `https://generated.photos/api/v1/faces?gender=${category === "women" ? "female" : "male"}&age=young-adult&emotion=joy&head_pose=front&skin_tone=light&hair_color=brown&hair_length=medium&eye_color=brown&glasses=false&beard=false&mustache=false&makeup=false`,
    // Unsplash portraits with better targeting
    `https://images.unsplash.com/photo-${1500000000 + seed * 1000}?w=400&h=400&fit=crop&crop=face&auto=format&q=80`,
  ];

  // Use different high-quality sources based on category and seed
  if (category === "women") {
    // Curated female portraits from Unsplash
    const womenImages = [
      `https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman smiling
      `https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Professional woman
      `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Young woman
      `https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Brunette woman
      `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Blonde woman
      `https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman with curly hair
      `https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman outdoors
      `https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman with glasses
      `https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman laughing
      `https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman portrait
      `https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman with long hair
      `https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman casual
      `https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman natural
      `https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman headshot
      `https://images.unsplash.com/photo-1541647376583-8934aaf3448a?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman professional
      `https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman stylish
      `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman confident
      `https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman modern
      `https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman trendy
      `https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman elegant
    ];
    return womenImages[seed % womenImages.length];
  } else if (category === "men") {
    // Curated male portraits from Unsplash
    const menImages = [
      `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man smiling
      `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man professional
      `https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man casual
      `https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man beard
      `https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man confident
      `https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man suit
      `https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man young
      `https://images.unsplash.com/photo-1558203728-00f45181dd84?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man trendy
      `https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man glasses
      `https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man business
      `https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man outdoor
      `https://images.unsplash.com/photo-1522556189639-b150ed9c4330?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man portrait
      `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man headshot
      `https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man modern
      `https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man stylish
      `https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man handsome
      `https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man athletic
      `https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man mature
      `https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man friendly
      `https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man attractive
    ];
    return menImages[seed % menImages.length];
  } else {
    // For LGBTQ+, mix of diverse gender presentations and expressions
    const lgbtqImages = [
      // Diverse feminine presentations
      `https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman smiling
      `https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Professional woman
      `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Young woman
      `https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Brunette woman
      `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Blonde woman
      `https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman with curly hair
      `https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman outdoors
      `https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman with glasses
      `https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman laughing
      `https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Woman portrait
      // Diverse masculine presentations
      `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man smiling
      `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man professional
      `https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man casual
      `https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man beard
      `https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man confident
      `https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man suit
      `https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man young
      `https://images.unsplash.com/photo-1558203728-00f45181dd84?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man trendy
      `https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man glasses
      `https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&h=400&fit=crop&crop=face&auto=format&q=80`, // Man business
    ];
    return lgbtqImages[seed % lgbtqImages.length];
  }
}

// Generate realistic review text with red flags
function generateReviewText(category, redFlag, description, name, city) {
  // More varied and realistic templates based on category
  const templates = {
    men: [
      `Met ${name} on Tinder and we went out a few times in ${city}. ${description}. Huge red flag - stay away!`,
      `Dated ${name} for about 2 months. At first he seemed really sweet but then ${description.toLowerCase()}. Should have listened to my friends.`,
      `${name} seemed like such a catch at first but ${description.toLowerCase()}. Really thought we had something special. Don't make my mistake.`,
      `Had such high hopes for ${name} but was completely let down. ${description}. Wasted 3 months of my life.`,
      `${description}. This was my experience with ${name} here in ${city}. Trust me, you don't want to deal with this drama.`,
      `Went on like 6 dates with ${name} and ${description.toLowerCase()}. Thought he was different but nope, same old story.`,
      `${name} and I matched on Bumble and talked for weeks. ${description}. Total waste of time - you've been warned!`,
      `${description}. That's what I dealt with dating ${name}. Started off so promising but turned into a nightmare.`,
    ],
    women: [
      `Met ${name} on Hinge and we went out several times in ${city}. ${description}. Major red flag - avoid!`,
      `Dated ${name} for a couple months. She seemed really cool initially but then ${description.toLowerCase()}. Should have seen it coming.`,
      `${name} appeared perfect at first but ${description.toLowerCase()}. Really disappointed because I thought she was the one. Save yourself the headache.`,
      `Had such high expectations for ${name} but was totally disappointed. ${description}. Not worth the emotional rollercoaster.`,
      `${description}. This was my experience with ${name} in ${city}. Wish someone had warned me beforehand.`,
      `Went on multiple dates with ${name} and ${description.toLowerCase()}. Really thought this could be something special but I was so wrong.`,
      `${name} and I connected on the app and chatted for weeks before meeting. ${description}. Complete waste of my time!`,
      `${description}. That's what happened with ${name}. Everything seemed great until it wasn't. Learn from my experience.`,
    ],
    "lgbtq+": [
      `Met ${name} on HER and we went out a few times in ${city}. ${description}. Definitely a red flag - be careful!`,
      `Dated ${name} for about 2 months. They seemed amazing at first but then ${description.toLowerCase()}. Should have trusted my instincts.`,
      `${name} seemed like such a great person initially but ${description.toLowerCase()}. Really thought we clicked. Don't waste your time.`,
      `Had really high hopes for ${name} but was completely disappointed. ${description}. Not worth the emotional investment.`,
      `${description}. This was my experience with ${name} here in ${city}. Wish I had seen the signs earlier.`,
      `Went on several dates with ${name} and ${description.toLowerCase()}. Thought we had real potential but clearly I was mistaken.`,
      `${name} and I matched and had great conversations for weeks. ${description}. Such a disappointment - you've been warned!`,
      `${description}. That's what I experienced with ${name}. Started with so much promise but ended badly. Hope this helps others avoid the same.`,
    ],
  };

  const categoryTemplates = templates[category] || templates.men;
  return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
}

// Generate additional context for reviews
function generateAdditionalContext(category) {
  const contexts = {
    men: [
      "We met through Bumble and talked for a week before meeting up.",
      "Matched on Tinder and he seemed really charming at first.",
      "Met at a coffee shop downtown for our first date.",
      "He asked me out after we met at a mutual friend's party.",
      "We had been talking for about a month before meeting in person.",
    ],
    women: [
      "We matched on Hinge and had great conversations initially.",
      "Met her at a bar through mutual friends.",
      "She seemed really sweet when we first started talking on the app.",
      "We went to dinner for our first date and it seemed promising.",
      "Had been chatting for weeks before we decided to meet up.",
    ],
    "lgbtq+": [
      "We met on HER and really clicked over our shared interests.",
      "Matched on Tinder and they seemed really genuine at first.",
      "Met at a local LGBTQ+ event and exchanged numbers.",
      "We had been talking on the app for a while before meeting.",
      "They reached out first and seemed really interested initially.",
    ],
  };

  return contexts[category][Math.floor(Math.random() * contexts[category].length)];
}

// Generate social media handles (optional)
function generateSocialMedia(name, includeChance = 0.3) {
  if (Math.random() > includeChance) return null;

  const platforms = ["instagram", "snapchat", "tiktok"];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  const handle = `${name.toLowerCase()}${Math.floor(Math.random() * 999)}`;

  return {
    [platform]: handle,
  };
}

// Main function to generate reviews
async function generateReviews() {
  console.log("🚀 Starting to generate dating reviews...");

  const reviews = [];
  const reviewsPerCity = 8; // 2-3 per category per city
  const totalReviews = MAJOR_CITIES.length * reviewsPerCity;

  console.log(`📊 Generating ${totalReviews} reviews across ${MAJOR_CITIES.length} cities...`);

  for (let cityIndex = 0; cityIndex < MAJOR_CITIES.length; cityIndex++) {
    const city = MAJOR_CITIES[cityIndex];
    console.log(`🏙️  Processing ${city.city}, ${city.state}...`);

    // Generate reviews for each category in this city
    const categories = ["men", "women", "lgbtq+"];

    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
      const category = categories[categoryIndex];
      const reviewsForCategory = Math.floor(reviewsPerCity / 3) + (categoryIndex < reviewsPerCity % 3 ? 1 : 0);

      for (let reviewIndex = 0; reviewIndex < reviewsForCategory; reviewIndex++) {
        const seed = cityIndex * 100 + categoryIndex * 10 + reviewIndex;
        const name = NAMES[category][seed % NAMES[category].length];
        const redFlagData = RED_FLAGS_DATA[category][seed % RED_FLAGS_DATA[category].length];
        const description = redFlagData.descriptions[seed % redFlagData.descriptions.length];

        const review = {
          reviewer_anonymous_id: `anon_${Date.now()}_${seed}`,
          reviewed_person_name: name,
          reviewed_person_location: {
            city: city.city,
            state: city.state,
            coordinates: {
              latitude: city.lat + (Math.random() - 0.5) * 0.1, // Add some variation
              longitude: city.lng + (Math.random() - 0.5) * 0.1,
            },
          },
          category: category,
          profile_photo: getProfileImage(category, seed),
          green_flags: [], // Mostly negative reviews
          red_flags: [redFlagData.flag],
          sentiment: "red",
          review_text: generateReviewText(category, redFlagData.flag, description, name, city.city),
          media: [
            {
              type: "image",
              uri: getProfileImage(category, seed),
              thumbnail: getProfileImage(category, seed),
            },
          ],
          social_media: generateSocialMedia(name),
          status: "approved",
          like_count: Math.floor(Math.random() * 50) + 5, // 5-55 likes
          dislike_count: Math.floor(Math.random() * 10), // 0-10 dislikes
          is_anonymous: true,
          location: `${city.city}, ${city.state}`,
        };

        reviews.push(review);
      }
    }
  }

  console.log(`✅ Generated ${reviews.length} reviews. Starting database insertion...`);
  return reviews;
}

// Insert reviews into Supabase database
async function insertReviews(reviews) {
  console.log(`💾 Inserting ${reviews.length} reviews into database...`);

  const batchSize = 50; // Insert in batches to avoid timeout
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < reviews.length; i += batchSize) {
    const batch = reviews.slice(i, i + batchSize);
    console.log(
      `📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(reviews.length / batchSize)} (${batch.length} reviews)...`,
    );

    try {
      const { data, error } = await supabase.from("reviews_firebase").insert(batch).select("id");

      if (error) {
        console.error(`❌ Error inserting batch:`, error);
        errors += batch.length;
      } else {
        console.log(`✅ Successfully inserted ${data.length} reviews`);
        inserted += data.length;
      }
    } catch (err) {
      console.error(`💥 Exception during batch insert:`, err);
      errors += batch.length;
    }

    // Small delay between batches
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 Final Results:`);
  console.log(`✅ Successfully inserted: ${inserted} reviews`);
  console.log(`❌ Failed to insert: ${errors} reviews`);
  console.log(`📈 Success rate: ${((inserted / reviews.length) * 100).toFixed(1)}%`);

  return { inserted, errors };
}

// Main execution function
async function main() {
  try {
    console.log("🎯 Starting dating review generation script...\n");

    // Generate reviews
    const reviews = await generateReviews();

    // Insert into database
    const results = await insertReviews(reviews);

    console.log("\n🎉 Script completed successfully!");
    console.log(`📊 Total reviews generated: ${reviews.length}`);
    console.log(`💾 Reviews inserted: ${results.inserted}`);
    console.log(`❌ Failed insertions: ${results.errors}`);
  } catch (error) {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}
