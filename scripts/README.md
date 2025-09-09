# Dating Reviews Data Generation

## Overview
This script generates realistic dating reviews with red flags for the LockerRoom app, populating the Supabase database with diverse, authentic-looking content across major US cities.

## What Was Generated

### 📊 **Data Statistics**
- **Total Reviews**: 408 reviews
- **Cities Covered**: 51 major US cities
- **Categories**: 
  - Men: 153 reviews
  - Women: 153 reviews  
  - LGBTQ+: 102 reviews
- **Success Rate**: 100% insertion success

### 🏙️ **Cities Included**
Major metropolitan areas across the United States including:
- New York, NY
- Los Angeles, CA
- Chicago, IL
- Houston, TX
- Phoenix, AZ
- Philadelphia, PA
- San Francisco, CA
- Seattle, WA
- Miami, FL
- Atlanta, GA
- And 41 more major cities

### 👥 **Categories & Red Flags**

#### **Men Category**
- **Controlling**: Checking phones, jealousy, isolation from friends
- **Dishonest**: Lying about relationship status, age, having kids
- **Disrespectful**: Rude to service workers, inappropriate comments
- **Unreliable**: Cancelling dates, always late, ghosting

#### **Women Category**  
- **Fake**: Using filtered photos, lying about career/education
- **Controlling**: Monitoring whereabouts, changing partner's style
- **Dishonest**: Hidden relationships, lying about having children
- **Rude**: Mean to staff, constantly on phone during dates

#### **LGBTQ+ Category**
- **Inconsistent**: Mixed signals about relationship goals
- **Dishonest**: Lying about being out, fake photos
- **Disrespectful**: Not respecting pronouns/boundaries
- **Unreliable**: Cancelling plans, disappearing without explanation

### 🖼️ **High-Quality Images**
- **Professional Photos**: Curated high-resolution portraits from Unsplash
- **Category-Appropriate**: Images correctly match the review categories
- **Diverse Representation**: Variety of ethnicities, ages, and presentations
- **Realistic Dating Profile Quality**: 400x400px optimized images

### 📝 **Realistic Review Content**
- **Authentic Language**: Natural, conversational tone
- **Varied Templates**: Different writing styles per category
- **Specific Details**: Mentions of dating apps (Tinder, Bumble, Hinge, HER)
- **Realistic Timeframes**: 2-3 months of dating mentioned
- **Location Context**: Reviews mention specific cities
- **Warning Tone**: Helpful, cautionary advice for other users

## Files Created

### `generate-dating-reviews.js`
Main script that:
- Generates realistic names by category
- Creates authentic review text with red flags
- Assigns high-quality profile images
- Distributes reviews across major US cities
- Inserts data into Supabase in batches

### `package.json`
Dependencies for the script:
- `@supabase/supabase-js`: Database integration
- `dotenv`: Environment variable management

### `.env`
Configuration file with Supabase credentials

## Usage

```bash
cd scripts
npm install
node generate-dating-reviews.js
```

## Database Schema
Reviews are inserted into the `reviews_firebase` table with fields:
- `reviewer_anonymous_id`: Anonymous reviewer identifier
- `reviewed_person_name`: Name of person being reviewed
- `reviewed_person_location`: City, state, and coordinates
- `category`: men/women/lgbtq+
- `profile_photo`: High-quality image URL
- `red_flags`: Array of red flag types
- `sentiment`: 'red' (negative reviews)
- `review_text`: Realistic review content
- `media`: Profile image metadata
- `social_media`: Optional social handles
- `status`: 'approved'
- `like_count`: 5-55 likes
- `dislike_count`: 0-10 dislikes
- `is_anonymous`: true
- `location`: City, State format

## Quality Improvements Made

1. **Better Images**: Replaced low-quality randomuser.me with high-resolution Unsplash portraits
2. **Category Accuracy**: Ensured images match the correct gender categories
3. **Realistic Reviews**: Created category-specific review templates with authentic language
4. **Diverse Content**: Varied red flags, names, and review styles
5. **Geographic Distribution**: Even coverage across major US metropolitan areas

The generated data provides a realistic foundation for testing and demonstrating the LockerRoom app's review system.
