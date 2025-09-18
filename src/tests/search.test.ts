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
  console.log("🧪 Testing Basic Search...");

  for (const query of TEST_QUERIES) {
    try {
      const results = await searchService.searchReviews(query, {
        searchMode: "basic",
      });

      console.log(`✅ Basic search for "${query}": ${results.total} results`);

      if (results.total === 0) {
        console.warn(`⚠️  No results for "${query}" - this might be expected for test data`);
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
  console.log("🧪 Testing Similarity Search...");

  for (const query of TYPO_QUERIES) {
    try {
      const results = await searchService.searchReviews(query, {
        searchMode: "similarity",
      });

      console.log(`✅ Similarity search for "${query}": ${results.total} results`);

      // Check if similarity scores are included
      const firstResult = results.reviews[0];
      if (firstResult?.metadata?.similarity) {
        console.log(`   → Similarity score: ${firstResult.metadata.similarity}`);
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
  console.log("🧪 Testing Full-Text Search...");

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

      console.log(`✅ FTS search for "${query}": ${results.total} results`);

      // Check if rank scores are included
      const firstResult = results.reviews[0];
      if (firstResult?.metadata?.rankScore) {
        console.log(`   → Rank score: ${firstResult.metadata.rankScore}`);
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
  console.log("🧪 Testing Hybrid Search...");

  for (const query of TEST_QUERIES.slice(0, 3)) {
    try {
      const results = await searchService.searchReviews(query, {
        searchMode: "hybrid",
        sortBy: "relevance",
      });

      console.log(`✅ Hybrid search for "${query}": ${results.total} results`);

      // Check if combined scores are included
      const firstResult = results.reviews[0];
      if (firstResult?.metadata?.combinedScore) {
        console.log(`   → Combined score: ${firstResult.metadata.combinedScore}`);
        console.log(`   → Similarity: ${firstResult.metadata.similarity}`);
        console.log(`   → FTS score: ${firstResult.metadata.rankScore}`);
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
  console.log("🧪 Testing Search with Filters...");

  try {
    const results = await searchService.searchAll("dating", {
      useAdvancedSearch: true,
      filters: {
        dateRange: "month",
        category: "dating",
      },
    });

    console.log(`✅ Filtered search: ${results.total} results`);
    console.log(`   → Reviews: ${results.reviews.length}`);
    console.log(`   → Comments: ${results.comments.length}`);
    console.log(`   → Messages: ${results.messages.length}`);
  } catch (error) {
    console.error("❌ Filtered search failed:", error);
  }
}

/**
 * Test search suggestions
 */
async function testSearchSuggestions(): Promise<void> {
  console.log("🧪 Testing Search Suggestions...");

  const partialQueries = ["da", "rel", "com"];

  for (const partial of partialQueries) {
    try {
      const suggestions = await searchService.getSearchSuggestions(partial, 5);
      console.log(`✅ Suggestions for "${partial}": [${suggestions.join(", ")}]`);
    } catch (error) {
      console.error(`❌ Suggestions failed for "${partial}":`, error);
    }
  }
}

/**
 * Test search extensions initialization
 */
async function testSearchInitialization(): Promise<void> {
  console.log("🧪 Testing Search Initialization...");

  try {
    await searchService.initializeSearchExtensions();
    console.log("✅ Search extensions initialized successfully");
  } catch (error) {
    console.error("❌ Search initialization failed:", error);
  }
}

/**
 * Performance test
 */
async function testSearchPerformance(): Promise<void> {
  console.log("🧪 Testing Search Performance...");

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

      console.log(`✅ ${mode} search: ${duration}ms, ${results.total} results`);
    } catch (error) {
      console.error(`❌ ${mode} search performance test failed:`, error);
    }
  }
}

/**
 * Run all tests
 */
export async function runAllSearchTests(): Promise<void> {
  console.log("🚀 Starting Search Functionality Tests...\n");

  await testSearchInitialization();
  console.log("");

  await testBasicSearch();
  console.log("");

  await testSimilaritySearch();
  console.log("");

  await testFullTextSearch();
  console.log("");

  await testHybridSearch();
  console.log("");

  await testSearchWithFilters();
  console.log("");

  await testSearchSuggestions();
  console.log("");

  await testSearchPerformance();
  console.log("");

  console.log("✨ Search tests completed!");
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
