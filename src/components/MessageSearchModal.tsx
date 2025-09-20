import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import { searchService } from '../services/search';
import { MessageSearchResult, ChatRoom, SearchResult, SearchResults, MessageType } from '../types';
import useAuthStore from '../state/authStore';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../providers/ThemeProvider';
import useChatStore from '../state/chatStore';

interface MessageSearchModalProps {
  visible: boolean;
  onClose: () => void;
  roomId?: string;
  onMessageSelect: (messageId: string, roomId: string) => void;
}

interface DateRangeFilter {
  label: string;
  value: 'today' | 'week' | 'month' | 'all';
  days?: number;
}

const DATE_FILTERS: DateRangeFilter[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today', days: 1 },
  { label: 'Past Week', value: 'week', days: 7 },
  { label: 'Past Month', value: 'month', days: 30 },
];

const RECENT_SEARCHES_KEY = '@message_search_recent';
const MAX_RECENT_SEARCHES = 10;

export const MessageSearchModal: React.FC<MessageSearchModalProps> = ({
  visible,
  onClose,
  roomId,
  onMessageSelect,
}) => {
  const { colors } = useTheme();
  const { chatRooms } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessageSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState(!roomId);
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateRangeFilter>(DATE_FILTERS[0]!);
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      loadRecentSearches();
      inputRef.current?.focus();
    }
  }, [visible]);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  const { user } = useAuthStore();

  const mapSearchResultsToMessageResults = (searchResults: SearchResults): MessageSearchResult[] => {
    return searchResults.messages.map((msg: SearchResult) => ({
      // SearchResult properties
      id: msg.id,
      type: msg.type,
      title: msg.title,
      content: msg.content,
      snippet: msg.snippet,
      createdAt: msg.createdAt,
      metadata: msg.metadata,
      // MessageSearchResult specific properties
      messageId: msg.metadata.messageId || msg.id,
      roomId: msg.metadata.roomId || roomId || '',
      roomName: msg.metadata.roomName || 'Unknown Room',
      senderId: (msg.metadata as any).senderId || '',
      senderName: (msg.metadata as any).senderName || msg.metadata.authorName || 'Unknown',
      messageType: 'text' as MessageType,
      highlightedContent: msg.snippet,
      contextBefore: undefined,
      contextAfter: undefined,
    }));
  };

  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let searchResponse: SearchResults;
        let results: MessageSearchResult[];

        if (globalSearch && user) {
          // Use global search with user ID
          searchResponse = await searchService.searchMessagesGlobal(query, user.id, 50, 0);
        } else if (roomId) {
          // Use room-specific search
          searchResponse = await searchService.searchMessages(roomId, query, 50, 0);
        } else {
          searchResponse = { reviews: [], comments: [], messages: [], total: 0 };
        }

        // Map SearchResults to MessageSearchResult[]
        results = mapSearchResultsToMessageResults(searchResponse);

        // Apply date filter
        if (selectedDateFilter.days) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - selectedDateFilter.days);
          results = results.filter(r => new Date(r.createdAt) >= cutoffDate);
        }

        // Apply sender filter
        if (selectedSender) {
          results = results.filter(r => r.senderId === selectedSender);
        }

        setSearchResults(results);

        // Get search suggestions
        if (results.length < 5) {
          const suggestions = await searchService.getSearchSuggestions(query);
          setSuggestions(suggestions);
          setShowSuggestions(true);
        }

        // Save to recent searches
        if (query.length > 2) {
          await saveRecentSearch(query);
        }
      } catch (err) {
        console.error('Search failed:', err);
        setError('Failed to search messages. Please try again.');
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [globalSearch, roomId, selectedDateFilter, selectedSender, user]
  );

  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  const handleResultPress = (result: MessageSearchResult) => {
    onMessageSelect(result.messageId, result.roomId);
    onClose();
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(false);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  const renderSearchResult = ({ item }: { item: MessageSearchResult }) => {
    const room = chatRooms.find(r => r.id === item.roomId);

    return (
      <TouchableOpacity
        style={[styles.resultItem, { backgroundColor: colors.surface[800] }]}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultHeader}>
          <Text style={[styles.senderName, { color: colors.brand.red }]}>
            {item.senderName}
          </Text>
          {globalSearch && room && (
            <Text style={[styles.roomName, { color: colors.text.secondary }]}>
              in {room.name}
            </Text>
          )}
          <Text style={[styles.timestamp, { color: colors.text.secondary }]}>
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </Text>
        </View>
        <Text
          style={[styles.messageContent, { color: colors.text.primary }]}
          numberOfLines={2}
        >
          {item.highlightedContent || item.content}
        </Text>
        {item.contextBefore && (
          <Text style={[styles.context, { color: colors.text.secondary }]}>
            ...{item.contextBefore}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { backgroundColor: colors.surface[800] }]}
      onPress={() => handleRecentSearchPress(item)}
    >
      <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
      <Text style={[styles.suggestionText, { color: colors.text.primary }]}>{item}</Text>
    </TouchableOpacity>
  );

  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { backgroundColor: colors.surface[800] }]}
      onPress={() => handleSuggestionPress(item)}
    >
      <Ionicons name="search-outline" size={16} color={colors.text.secondary} />
      <Text style={[styles.suggestionText, { color: colors.text.primary }]}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { backgroundColor: colors.surface[800] }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text.primary }]}>Search Messages</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.surface[700] }]}>
            <Ionicons name="search" size={20} color={colors.text.secondary} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: colors.text.primary }]}
              placeholder="Search messages..."
              placeholderTextColor={colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.text.primary }]}>Search scope:</Text>
              <View style={styles.scopeToggle}>
                <Text style={[styles.scopeText, { color: colors.text.primary }]}>
                  {globalSearch ? 'All Rooms' : 'Current Room'}
                </Text>
                <Switch
                  value={globalSearch}
                  onValueChange={setGlobalSearch}
                  disabled={!roomId}
                  trackColor={{ false: colors.border.default, true: colors.brand.red }}
                  thumbColor={'#fff'}
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.text.primary }]}>Date range:</Text>
              <View style={styles.dateFilters}>
                {DATE_FILTERS.map(filter => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[
                      styles.dateFilterButton,
                      { backgroundColor: colors.surface[700] },
                      selectedDateFilter.value === filter.value && {
                        backgroundColor: colors.brand.red,
                      },
                    ]}
                    onPress={() => setSelectedDateFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.dateFilterText,
                        { color: colors.text.primary },
                        selectedDateFilter.value === filter.value && { color: '#fff' },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {searchQuery.length === 0 && recentSearches.length > 0 && (
          <View style={styles.recentSearchesContainer}>
            <View style={styles.recentSearchesHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Searches</Text>
              <TouchableOpacity onPress={clearRecentSearches}>
                <Text style={[styles.clearButton, { color: colors.brand.red }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentSearches}
              keyExtractor={(item, index) => `recent-${index}`}
              renderItem={renderRecentSearch}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.recentSearchesList}
            />
          </View>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Suggestions</Text>
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => `suggestion-${index}`}
              renderItem={renderSuggestion}
              style={styles.suggestionsList}
            />
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brand.red} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
              Searching messages...
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.text.error} />
            <Text style={[styles.errorText, { color: colors.text.error }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.brand.red }]}
              onPress={() => performSearch(searchQuery)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !error && searchQuery.length > 0 && (
          <FlatList
            data={searchResults}
            keyExtractor={item => item.id}
            renderItem={renderSearchResult}
            contentContainerStyle={styles.resultsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color={colors.text.secondary} />
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                  No messages found
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
                  Try adjusting your search terms or filters
                </Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    marginTop: 12,
    gap: 12,
  },
  filterRow: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  scopeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scopeText: {
    fontSize: 14,
  },
  dateFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  dateFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dateFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recentSearchesContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 14,
  },
  recentSearchesList: {
    maxHeight: 40,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  suggestionsList: {
    maxHeight: 120,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    gap: 8,
  },
  suggestionText: {
    fontSize: 14,
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultItem: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  roomName: {
    fontSize: 12,
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  context: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
  },
});