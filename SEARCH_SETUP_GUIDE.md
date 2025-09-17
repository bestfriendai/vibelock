# Enhanced Search Functionality Setup Guide

## Overview

This guide explains how to set up and use the enhanced search functionality for your React Native/Expo app with Supabase. The implementation includes:

- **Basic text search** using PostgreSQL ILIKE
- **Similarity search** using pg_trgm extension
- **Full-text search** using PostgreSQL tsvector
- **Hybrid search** combining similarity and full-text search
- **Search analytics** for monitoring and optimization

## Prerequisites

- Supabase project with PostgreSQL database
- React Native/Expo app
- `@supabase/supabase-js` installed

## Step 1: Database Setup

### 1.1 Run the SQL Setup Script

Execute the contents of `supabase-search-setup.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `supabase-search-setup.sql`
4. Click "Run"

This will:
- Enable the `pg_trgm` extension
- Create custom search functions
- Set up GIN indexes for better performance
- Create search analytics table
- Set up Row Level Security policies

### 1.2 Verify Installation

Check that the extension and functions are installed:

```sql
-- Check pg_trgm extension
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';

-- Check custom functions
SELECT proname FROM pg_proc WHERE proname LIKE '%search%';

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'reviews_firebase';
```

## Step 2: Application Integration

### 2.1 Enhanced Search Service

The updated `SearchService` class provides multiple search methods:

```typescript
import { searchService } from '../services/search';

// Basic search (fallback)
const basicResults = await searchService.searchReviews(query, {
  searchMode: 'basic'
});

// Similarity search using pg_trgm
const similarityResults = await searchService.searchReviews(query, {
  searchMode: 'similarity'
});

// Full-text search
const ftsResults = await searchService.searchReviews(query, {
  searchMode: 'fts'
});

// Hybrid search (recommended)
const hybridResults = await searchService.searchReviews(query, {
  searchMode: 'hybrid',
  sortBy: 'relevance'
});
```

### 2.2 Search with Filters

Enhanced search supports filtering:

```typescript
const results = await searchService.searchAll(query, {
  useAdvancedSearch: true,
  filters: {
    dateRange: 'month',  // 'week', 'month', 'year', 'all'
    location: 'New York',
    category: 'dating'
  }
});
```

### 2.3 Search Suggestions

Get intelligent search suggestions:

```typescript
const suggestions = await searchService.getSearchSuggestions('da', 10);
// Returns: ['dating experience', 'date night', 'dating tips', ...]
```

## Step 3: Performance Optimization

### 3.1 Index Management

The setup script creates these indexes automatically:

```sql
-- Trigram indexes for similarity search
CREATE INDEX idx_reviews_firebase_review_text_gin
ON reviews_firebase USING gin(review_text gin_trgm_ops);

-- Full-text search index
CREATE INDEX idx_reviews_firebase_fts
ON reviews_firebase USING gin(
  to_tsvector('english', COALESCE(review_text, '') || ' ' || COALESCE(reviewed_person_name, ''))
);
```

### 3.2 Search Analytics

Monitor search performance:

```sql
-- View search analytics
SELECT
  search_type,
  AVG(execution_time_ms) as avg_time,
  AVG(results_count) as avg_results,
  COUNT(*) as total_searches
FROM search_analytics
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY search_type;
```

## Step 4: React Native Implementation

### 4.1 Enhanced SearchScreen

The `SearchScreen.tsx` has been updated to use the new search capabilities:

- Intelligent search mode selection
- Filter support
- Enhanced error handling
- Search analytics logging

### 4.2 Search Configuration

Configure search behavior in your search service:

```typescript
const SEARCH_CONFIG = {
  similarityThreshold: 0.3,     // pg_trgm similarity threshold
  wordSimilarityThreshold: 0.6, // Word similarity threshold
  maxResults: 50,               // Maximum results per search
  defaultResultsPerType: 25,    // Results per content type
};
```

## Step 5: Testing and Validation

### 5.1 Test Search Functionality

1. **Basic Search**: Test with simple keywords
2. **Similarity Search**: Test with typos and partial words
3. **Full-text Search**: Test with natural language queries
4. **Hybrid Search**: Test complex queries combining multiple terms

### 5.2 Performance Testing

Monitor search performance:

```typescript
// Enable search analytics in production
process.env.NODE_ENV = 'production';

// Test with various query types
const testQueries = [
  'dating experience',
  'reltionship', // typo
  'red flags toxic behavior',
  'funny sweet personality'
];
```

## Step 6: Advanced Features

### 6.1 Custom Search Functions

You can extend the search functionality by adding custom PostgreSQL functions:

```sql
-- Example: Search with date weighting
CREATE OR REPLACE FUNCTION date_weighted_search(
  search_query TEXT,
  recency_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE(id UUID, score FLOAT, content JSONB)
AS $$
-- Implementation here
$$;
```

### 6.2 Search Result Ranking

Implement custom ranking algorithms:

```typescript
// Custom ranking based on multiple factors
const rankResults = (results: SearchResult[]) => {
  return results.sort((a, b) => {
    const scoreA = (a.similarity * 0.4) +
                   (a.rankScore * 0.4) +
                   (a.recency * 0.2);
    const scoreB = (b.similarity * 0.4) +
                   (b.rankScore * 0.4) +
                   (b.recency * 0.2);
    return scoreB - scoreA;
  });
};
```

## Troubleshooting

### Common Issues

1. **Extension not enabled**: Ensure pg_trgm is installed
2. **Function not found**: Check if custom functions were created successfully
3. **Slow searches**: Verify indexes are created and being used
4. **No results**: Check table names and column names in queries

### Debug Queries

```sql
-- Check if pg_trgm is working
SELECT 'hello' % 'helo' as similarity_test;

-- Test custom functions
SELECT * FROM similarity_search('test', 'reviews_firebase', 'review_text');

-- Check index usage
EXPLAIN ANALYZE SELECT * FROM reviews_firebase WHERE review_text % 'search';
```

## Security Considerations

1. **RLS Policies**: Ensure Row Level Security is properly configured
2. **Function Security**: Use SECURITY DEFINER carefully
3. **Input Validation**: Always validate and sanitize search queries
4. **Rate Limiting**: Implement search rate limiting in your application

## Performance Tips

1. **Use appropriate search modes** based on query type
2. **Implement caching** for frequent searches
3. **Monitor search analytics** to optimize performance
4. **Consider search result pagination** for large datasets
5. **Use connection pooling** for high-traffic applications

## Migration from Basic Search

If you're migrating from basic ILIKE search:

1. Deploy the enhanced search service
2. Update search calls gradually
3. Monitor performance metrics
4. Compare search quality between old and new systems
5. Gradually phase out basic search

The enhanced search system provides backward compatibility, so existing search functionality will continue working while you migrate to the new features.