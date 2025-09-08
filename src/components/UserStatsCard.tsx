import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import useAuthStore from '../state/authStore';
import useSubscriptionStore from '../state/subscriptionStore';
import { supabase } from '../services/supabase';

interface UserStats {
  reviewsPosted: number;
  totalLikes: number;
  totalComments: number;
  averageRating: number;
  joinDate: string;
  lastActive: string;
  reviewsThisMonth: number;
  topCategory: string;
}

interface StatItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  subtitle?: string;
  isPremium?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, subtitle, isPremium }) => {
  const { colors } = useTheme();
  
  return (
    <View className="flex-1 items-center py-3">
      <View className="flex-row items-center mb-1">
        <Ionicons name={icon} size={16} color={colors.brand.red} />
        {isPremium && (
          <View className="w-2 h-2 bg-amber-500 rounded-full ml-1" />
        )}
      </View>
      <Text 
        className="text-lg font-bold"
        style={{ color: colors.text.primary }}
      >
        {value}
      </Text>
      <Text 
        className="text-xs text-center"
        style={{ color: colors.text.secondary }}
      >
        {label}
      </Text>
      {subtitle && (
        <Text 
          className="text-xs text-center mt-1"
          style={{ color: colors.text.muted }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};

export default function UserStatsCard() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { isPremium } = useSubscriptionStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadUserStats();
    }
  }, [user?.id]);

  const loadUserStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, created_at, sentiment, category, likes_count')
        .eq('user_id', user.id);

      if (reviewsError) throw reviewsError;

      // Get user's comments
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id, created_at')
        .eq('user_id', user.id);

      if (commentsError) throw commentsError;

      // Calculate stats
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const reviewsThisMonth = reviews?.filter(r => 
        new Date(r.created_at) >= thisMonth
      ).length || 0;

      const totalLikes = reviews?.reduce((sum, r) => sum + (r.likes_count || 0), 0) || 0;
      
      // Calculate most common category
      const categoryCount: Record<string, number> = {};
      reviews?.forEach(r => {
        categoryCount[r.category] = (categoryCount[r.category] || 0) + 1;
      });
      const topCategory = Object.keys(categoryCount).reduce((a, b) => 
        categoryCount[a] > categoryCount[b] ? a : b, 'men'
      );

      // Calculate average sentiment (simplified)
      const positiveReviews = reviews?.filter(r => r.sentiment === 'positive').length || 0;
      const totalReviews = reviews?.length || 0;
      const averageRating = totalReviews > 0 ? (positiveReviews / totalReviews) * 5 : 0;

      const userStats: UserStats = {
        reviewsPosted: totalReviews,
        totalLikes,
        totalComments: comments?.length || 0,
        averageRating: Math.round(averageRating * 10) / 10,
        joinDate: user.created_at || new Date().toISOString(),
        lastActive: new Date().toISOString(),
        reviewsThisMonth,
        topCategory: topCategory.charAt(0).toUpperCase() + topCategory.slice(1),
      };

      setStats(userStats);
    } catch (error) {
      console.error('Failed to load user stats:', error);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  };

  if (loading) {
    return (
      <View 
        className="rounded-xl p-6 mb-6"
        style={{ backgroundColor: colors.surface[800] }}
      >
        <View className="flex-row items-center justify-center">
          <View className="w-6 h-6 border-2 border-gray-400 border-t-white rounded-full animate-spin mr-3" />
          <Text style={{ color: colors.text.secondary }}>Loading statistics...</Text>
        </View>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View 
        className="rounded-xl p-6 mb-6"
        style={{ backgroundColor: colors.surface[800] }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="stats-chart-outline" size={20} color={colors.text.muted} />
            <Text className="ml-3" style={{ color: colors.text.secondary }}>
              Statistics unavailable
            </Text>
          </View>
          <Pressable onPress={loadUserStats}>
            <Ionicons name="refresh" size={20} color={colors.brand.red} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View 
      className="rounded-xl p-6 mb-6"
      style={{ backgroundColor: colors.surface[800] }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <Ionicons name="stats-chart" size={20} color={colors.brand.red} />
          <Text 
            className="ml-3 font-semibold text-lg"
            style={{ color: colors.text.primary }}
          >
            Your Activity
          </Text>
        </View>
        <Pressable onPress={loadUserStats}>
          <Ionicons name="refresh" size={16} color={colors.text.muted} />
        </Pressable>
      </View>

      {/* Main Stats Grid */}
      <View className="flex-row mb-4">
        <StatItem
          icon="document-text-outline"
          label="Reviews Posted"
          value={stats.reviewsPosted}
        />
        <StatItem
          icon="heart-outline"
          label="Total Likes"
          value={stats.totalLikes}
        />
        <StatItem
          icon="chatbubble-outline"
          label="Comments"
          value={stats.totalComments}
        />
      </View>

      {/* Premium Stats */}
      {isPremium && (
        <>
          <View className="h-px mb-4" style={{ backgroundColor: colors.border }} />
          <View className="flex-row mb-4">
            <StatItem
              icon="trending-up-outline"
              label="This Month"
              value={stats.reviewsThisMonth}
              subtitle="reviews"
              isPremium
            />
            <StatItem
              icon="star-outline"
              label="Avg Rating"
              value={stats.averageRating.toFixed(1)}
              subtitle="out of 5"
              isPremium
            />
            <StatItem
              icon="person-outline"
              label="Top Category"
              value={stats.topCategory}
              isPremium
            />
          </View>
        </>
      )}

      {/* Join Date */}
      <View className="flex-row items-center justify-center pt-2">
        <Ionicons name="calendar-outline" size={14} color={colors.text.muted} />
        <Text 
          className="ml-2 text-sm"
          style={{ color: colors.text.muted }}
        >
          Member since {formatJoinDate(stats.joinDate)}
        </Text>
      </View>

      {/* Premium Upgrade Prompt */}
      {!isPremium && (
        <View 
          className="mt-4 p-3 rounded-lg"
          style={{ backgroundColor: colors.surface[700] }}
        >
          <Text 
            className="text-center text-sm"
            style={{ color: colors.text.secondary }}
          >
            <Text style={{ color: colors.brand.red }}>Upgrade to Plus</Text>
            {' '}for detailed analytics, monthly trends, and performance insights
          </Text>
        </View>
      )}
    </View>
  );
}
