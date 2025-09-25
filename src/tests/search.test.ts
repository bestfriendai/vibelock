import { searchService } from "../services/search";

// Mock the search service
jest.mock("../services/search", () => ({
  searchService: {
    searchReviews: jest.fn(),
    searchAll: jest.fn(),
    getSearchSuggestions: jest.fn(),
    initializeSearchExtensions: jest.fn(),
  },
}));

describe("Search Service Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Search Functionality", () => {
    it("should call searchReviews with correct parameters", async () => {
      const mockResults = {
        total: 5,
        reviews: [
          { id: "1", content: "Test review 1" },
          { id: "2", content: "Test review 2" },
        ],
      };

      (searchService.searchReviews as jest.Mock).mockResolvedValue(mockResults);

      const results = await searchService.searchReviews("test query", {
        searchMode: "basic",
      });

      expect(searchService.searchReviews).toHaveBeenCalledWith("test query", {
        searchMode: "basic",
      });
      expect(results).toEqual(mockResults);
    });

    it("should handle search errors gracefully", async () => {
      const error = new Error("Search failed");
      (searchService.searchReviews as jest.Mock).mockRejectedValue(error);

      await expect(searchService.searchReviews("test query", { searchMode: "basic" })).rejects.toThrow("Search failed");
    });
  });

  describe("Search Suggestions", () => {
    it("should return suggestions for partial queries", async () => {
      const mockSuggestions = ["dating", "relationship", "communication"];
      (searchService.getSearchSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      const suggestions = await searchService.getSearchSuggestions("da", 5);

      expect(searchService.getSearchSuggestions).toHaveBeenCalledWith("da", 5);
      expect(suggestions).toEqual(mockSuggestions);
    });
  });

  describe("Search Initialization", () => {
    it("should initialize search extensions", async () => {
      (searchService.initializeSearchExtensions as jest.Mock).mockResolvedValue(undefined);

      await searchService.initializeSearchExtensions();

      expect(searchService.initializeSearchExtensions).toHaveBeenCalled();
    });
  });

  describe("Advanced Search", () => {
    it("should handle filtered searches", async () => {
      const mockResults = {
        total: 3,
        results: ["result1", "result2", "result3"],
      };

      (searchService.searchAll as jest.Mock).mockResolvedValue(mockResults);

      const results = await searchService.searchAll("dating", {
        useAdvancedSearch: true,
        filters: {
          dateRange: "month",
          category: "dating",
        },
      });

      expect(searchService.searchAll).toHaveBeenCalledWith("dating", {
        useAdvancedSearch: true,
        filters: {
          dateRange: "month",
          category: "dating",
        },
      });
      expect(results).toEqual(mockResults);
    });
  });
});
