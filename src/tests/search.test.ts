/**
 * Search Functionality Tests
 *
 * Run these tests to validate that the enhanced search functionality is working correctly.
 * Note: These are integration tests that require a working Supabase connection.
 */

import { searchService } from "../services/search";

// Test configuration
const TEST_QUERIES = [
  "dating experience",
  "relationship",
  "toxic behavior",
  "sweet personality",
  "red flags",
  "communication",
];

const TYPO_QUERIES = [
  "relatinship", // relationship
  "comunication", // communication
  "experiance", // experience
];

/**
 * Test basic search functionality
 */
async function testBasicSearch(): Promise<void> {
  for (const query of TEST_QUERIES) {
    try {
      const results = await searchService.searchReviews(query, {
        searchMode: "basic",
      });

      if (results.total === 0) {
        console.log(`⚠️ No results for basic search: "${query}"`);
      } else {
        console.log(`✓ Basic search found ${results.total} results for "${query}"`);
      }
    } catch (error) {
      console.error(`❌ Basic search failed for "${query}":`, error);
    }
  }
}

/**
 * Test similarity search (requires pg_trgm extension)
 */
async function testSimilaritySearch(): Promise<void> {
  for (const query of TYPO_QUERIES) {
    try {
      const results = await searchService.searchReviews(query, {
        searchMode: "similarity",
      });

      // Check if similarity scores are included
      const firstResult = results.reviews[0];
      if (firstResult?.metadata?.similarity) {
        console.log(`✓ Similarity search worked for "${query}" with score ${firstResult.metadata.similarity}`);
      } else {
        console.log(`⚠️ No similarity score for "${query}"`);
      }
    } catch (error) {
      console.error(`❌ Similarity search failed for "${query}":`, error);
    }
  }
}

/**
 * Test full-text search
 */
async function testFullTextSearch(): Promise<void> {
  const ftsQueries = [
    "dating experience with communication",
    "red flags toxic behavior",
    "sweet personality and funny",
  ];

  for (const query of ftsQueries) {
    try {
      const results = await searchService.searchReviews(query, {
        searchMode: "fts",
      });

      // Check if rank scores are included
      const firstResult = results.reviews[0];
      if (firstResult?.metadata?.rankScore) {
        console.log(`✓ FTS search worked for "${query}" with rank score ${firstResult.metadata.rankScore}`);
      } else {
        console.log(`⚠️ No rank score for "${query}"`);
      }
    } catch (error) {
      console.error(`❌ FTS search failed for "${query}":`, error);
    }
  }
}

/**
 * Test hybrid search (recommended)
 */
async function testHybridSearch(): Promise<void> {
  for (const query of TEST_QUERIES.slice(0, 3)) {
    try {
      const results = await searchService.searchReviews(query, {
        searchMode: "hybrid",
        sortBy: "relevance",
      });

      // Check if combined scores are included
      const firstResult = results.reviews[0];
      if (firstResult?.metadata?.combinedScore) {
        console.log(`✓ Hybrid search worked for "${query}" with combined score ${firstResult.metadata.combinedScore}`);
      } else {
        console.log(`⚠️ No combined score for "${query}"`);
      }
    } catch (error) {
      console.error(`❌ Hybrid search failed for "${query}":`, error);
    }
  }
}

/**
 * Test search with filters
 */
async function testSearchWithFilters(): Promise<void> {
  try {
    const results = await searchService.searchAll("dating", {
      useAdvancedSearch: true,
      filters: {
        dateRange: "month",
        category: "dating",
      },
    });
    console.log(`✓ Filtered search completed successfully`);
  } catch (error) {
    console.error("❌ Filtered search failed:", error);
  }
}

/**
 * Test search suggestions
 */
async function testSearchSuggestions(): Promise<void> {
  const partialQueries = ["da", "rel", "com"];

  for (const partial of partialQueries) {
    try {
      const suggestions = await searchService.getSearchSuggestions(partial, 5);
      console.log(`✓ Got ${suggestions.length} suggestions for "${partial}"`);
    } catch (error) {
      console.error(`❌ Suggestions failed for "${partial}":`, error);
    }
  }
}

/**
 * Test search extensions initialization
 */
async function testSearchInitialization(): Promise<void> {
  try {
    await searchService.initializeSearchExtensions();
    console.log("✓ Search extensions initialized successfully");
  } catch (error) {
    console.error("❌ Search initialization failed:", error);
  }
}

/**
 * Performance test
 */
async function testSearchPerformance(): Promise<void> {
  const query = "dating experience";
  const searchModes = ["basic", "similarity", "fts", "hybrid"] as const;

  for (const mode of searchModes) {
    const startTime = Date.now();

    try {
      const results = await searchService.searchReviews(query, {
        searchMode: mode,
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✓ ${mode} search completed in ${duration}ms`);
    } catch (error) {
      console.error(`❌ ${mode} search performance test failed:`, error);
    }
  }
}

/**
 * Run all tests
 */
export async function runAllSearchTests(): Promise<void> {
  await testSearchInitialization();
  await testBasicSearch();
  await testSimilaritySearch();
  await testFullTextSearch();
  await testHybridSearch();
  await testSearchWithFilters();
  await testSearchSuggestions();
  await testSearchPerformance();
  console.log("✅ All search tests completed");
}

// Export individual test functions for selective testing
export {
  testBasicSearch,
  testSimilaritySearch,
  testFullTextSearch,
  testHybridSearch,
  testSearchWithFilters,
  testSearchSuggestions,
  testSearchInitialization,
  testSearchPerformance,
};

// Usage example:
// import { runAllSearchTests } from './src/tests/search.test';
// runAllSearchTests().catch(console.error);
