import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getMyPatientProfile } from '../../api/profileApi';
import {
  educationArticles,
  getRecommendedArticles,
  BADGE_CONFIG,
} from '../../data/educationArticles';

const { width: SCREEN_W } = Dimensions.get('window');
const DISCLAIMER = 'Nội dung chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ.';

const FILTER_TABS = [
  { key: 'all', label: 'Tất cả', icon: 'grid-outline', activeIcon: 'grid', color: '#3B82F6' },
  { key: 'recommended', label: 'Cho bạn', icon: 'star-outline', activeIcon: 'star', color: '#F59E0B' },
  { key: 'bloodPressure', label: 'Huyết áp', icon: 'heart-outline', activeIcon: 'heart', color: '#EF4444' },
  { key: 'glucose', label: 'Tiểu đường', icon: 'water-outline', activeIcon: 'water', color: '#8B5CF6' },
  { key: 'general', label: 'Sinh tồn', icon: 'pulse-outline', activeIcon: 'pulse', color: '#10B981' },
  { key: 'general_app', label: 'Dùng app', icon: 'phone-portrait-outline', activeIcon: 'phone-portrait', color: '#6366F1' },
  { key: 'lifestyle', label: 'Lối sống', icon: 'leaf-outline', activeIcon: 'leaf', color: '#EAB308' },
];

// Màu gradient giả bằng lớp view chồng
const CATEGORY_COLORS = {
  bloodPressure: { from: '#FF6B6B', to: '#EE5A24', light: '#FFF0F0', soft: '#FF8A8A' },
  glucose: { from: '#667EEA', to: '#764BA2', light: '#F0F0FF', soft: '#818CF8' },
  general: { from: '#11998E', to: '#2196F3', light: '#F0FFF9', soft: '#34D399' },
  lifestyle: { from: '#F7971E', to: '#FFD200', light: '#FFFBF0', soft: '#FBBF24' },
  medication: { from: '#A855F7', to: '#EC4899', light: '#FFF0FF', soft: '#C084FC' },
};

function StatsBanner({ total, recommended }) {
  return (
    <View style={s.statsBanner}>
      <View style={s.statItem}>
        <Text style={s.statNum}>{total}</Text>
        <Text style={s.statLabel}>Bài học</Text>
      </View>
      <View style={s.statDivider} />
      <View style={s.statItem}>
        <Text style={s.statNum}>5</Text>
        <Text style={s.statLabel}>Câu quiz/bài</Text>
      </View>
      <View style={s.statDivider} />
      <View style={s.statItem}>
        <Text style={s.statNum}>5</Text>
        <Text style={s.statLabel}>Chủ đề</Text>
      </View>
    </View>
  );
}

function ArticleCard({ article, onPress }) {
  const colors = CATEGORY_COLORS[article.diseaseType] || CATEGORY_COLORS.general;
  const badge = BADGE_CONFIG[article.diseaseType] || {};
  const emoji = article.emoji || badge.emoji || '📖';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.88}>
      {/* Colored accent bar */}
      <View style={[s.cardAccent, { backgroundColor: colors.from }]} />

      <View style={s.cardInner}>
        {/* Emoji icon */}
        <View style={[s.cardEmojiWrap, { backgroundColor: colors.light }]}>
          <Text style={s.cardEmoji}>{emoji}</Text>
        </View>

        <View style={s.cardContent}>
          {/* Badge + time */}
          <View style={s.cardTop}>
            <View style={[s.badge, { backgroundColor: badge.bg || '#F3F4F6' }]}>
              <Text style={[s.badgeText, { color: badge.color || '#374151' }]}>
                {badge.label || article.diseaseType}
              </Text>
            </View>
            <View style={s.cardMeta}>
              <Ionicons name="time-outline" size={11} color="#9CA3AF" />
              <Text style={s.cardMetaText}>{article.estimatedMinutes} phút</Text>
            </View>
          </View>

          <Text style={s.cardTitle} numberOfLines={2}>{article.title}</Text>
          <Text style={s.cardSummary} numberOfLines={2}>{article.summary}</Text>

          {/* Footer */}
          <View style={s.cardFooter}>
            <View style={s.quizPill}>
              <Ionicons name="help-circle-outline" size={12} color={badge.color || '#6B7280'} />
              <Text style={[s.quizPillText, { color: badge.color || '#6B7280' }]}>
                {article.quiz?.length || 0} câu quiz
              </Text>
            </View>
            <View style={[s.readBtn, { backgroundColor: colors.from }]}>
              <Text style={s.readBtnText}>Đọc →</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FeaturedCard({ article, onPress }) {
  const colors = CATEGORY_COLORS[article.diseaseType] || CATEGORY_COLORS.general;
  const badge = BADGE_CONFIG[article.diseaseType] || {};
  const emoji = article.emoji || badge.emoji || '📖';

  return (
    <TouchableOpacity
      style={[s.featCard, { backgroundColor: colors.soft }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={s.featLeft}>
        <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text style={[s.badgeText, { color: '#fff' }]}>{badge.label}</Text>
        </View>
        <Text style={s.featTitle} numberOfLines={2}>{article.title}</Text>
        <Text style={s.featSummary} numberOfLines={2}>{article.summary}</Text>
        <View style={s.featFooter}>
          <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.8)" />
          <Text style={s.featMeta}>{article.estimatedMinutes} phút · {article.quiz?.length} câu quiz</Text>
        </View>
      </View>
      <Text style={s.featEmoji}>{emoji}</Text>
    </TouchableOpacity>
  );
}

export default function EducationHomeScreen() {
  const navigation = useNavigation();
  const [activeFilter, setActiveFilter] = useState('all');
  const [diseaseTypes, setDiseaseTypes] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    setVisibleCount(5);
  }, [activeFilter, searchText]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const res = await getMyPatientProfile();
          const data = res?.body?.data || res?.body?.user || res?.body;
          if (data?.diseaseTypes) setDiseaseTypes(data.diseaseTypes);
        } catch { /* không crash */ }
      })();
    }, [])
  );

  const getFiltered = useCallback(() => {
    let list = educationArticles;
    if (activeFilter === 'recommended') {
      list = getRecommendedArticles(diseaseTypes);
    } else if (activeFilter === 'bloodPressure') {
      list = educationArticles.filter((a) => a.diseaseType === 'bloodPressure');
    } else if (activeFilter === 'glucose') {
      list = educationArticles.filter((a) => a.diseaseType === 'glucose');
    } else if (activeFilter === 'general') {
      list = educationArticles.filter((a) => a.diseaseType === 'general');
    } else if (activeFilter === 'general_app') {
      list = educationArticles.filter((a) => a.tags?.some((t) => t.toLowerCase().includes('app')));
    } else if (activeFilter === 'lifestyle') {
      list = educationArticles.filter(
        (a) => a.diseaseType === 'lifestyle' || a.diseaseType === 'medication'
      );
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeFilter, diseaseTypes, searchText]);

  const articles = getFiltered();

  // Daily featured & Recommended logic for main screen
  const dailyFeatured = useMemo(() => {
    const practicalIds = ['bp_how_to_measure', 'glucose_pre_post_meal', 'app_input_correctly', 'app_understand_alerts', 'medication_adherence', 'bp_when_to_contact_doctor'];
    let list = getRecommendedArticles(diseaseTypes);
    return list.find(a => practicalIds.includes(a.id)) || list[0] || educationArticles[0];
  }, [diseaseTypes]);

  const recommendedShortList = useMemo(() => {
    return getRecommendedArticles(diseaseTypes)
      .filter(a => a.id !== dailyFeatured?.id)
      .slice(0, 3);
  }, [diseaseTypes, dailyFeatured]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4FF' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ─── HEADER ─── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerGreet}>Học để khỏe hơn 💪</Text>
            <Text style={s.headerTitle}>Giáo dục sức khỏe</Text>
            <Text style={s.headerSub}>Kiến thức ngắn, dễ hiểu, đúng với bạn</Text>
          </View>
          <View style={s.headerIconBig}>
            <Text style={{ fontSize: 40 }}>👩‍⚕️</Text>
          </View>
        </View>

        {/* ─── STATS ─── */}
        <StatsBanner total={educationArticles.length} />

        {/* ─── DISCLAIMER ─── */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerIcon}>⚕️</Text>
          <Text style={s.disclaimerText}>{DISCLAIMER}</Text>
        </View>

        {/* ─── SEARCH ─── */}
        <View style={[s.searchWrap, { marginTop: 16 }]}>
          <Ionicons name="search-outline" size={17} color="#9CA3AF" />
          <TextInput
            style={s.searchInput}
            placeholder="Tìm bài học..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={17} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── FILTER CHIPS ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  s.chip,
                  { borderColor: isActive ? '#2563EB' : tab.color + '40' },
                  isActive && s.chipActive
                ]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={15}
                  color={isActive ? '#FFFFFF' : tab.color}
                  style={{ marginRight: 6 }}
                />
                <Text style={[
                  s.chipText,
                  !isActive && { color: tab.color },
                  isActive && s.chipTextActive
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── BÀI HỌC HÔM NAY ─── */}
        {activeFilter === 'all' && searchText.trim() === '' && dailyFeatured && (
          <View style={{ paddingHorizontal: 16, marginTop: 4, marginBottom: 16 }}>
            <Text style={s.sectionLabel}>✨ Bài học hôm nay</Text>
            <FeaturedCard
              article={dailyFeatured}
              onPress={() => navigation.navigate('EducationArticle', { articleId: dailyFeatured.id })}
            />
          </View>
        )}

        {/* ─── SECTION TITLE & COUNT ─── */}
        <View style={s.listHeaderRow}>
          <Text style={s.listSectionTitle}>
            {FILTER_TABS.find((t) => t.key === activeFilter)?.label || 'Tất cả bài học'}
          </Text>
          <Text style={s.countText}>{articles.length} bài học</Text>
        </View>

        {/* ─── ARTICLE GRID ─── */}
        <View style={{ paddingHorizontal: 16 }}>
          {articles.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={s.emptyText}>Không tìm thấy bài học phù hợp.</Text>
            </View>
          ) : (
            <>
              {articles.slice(0, visibleCount).map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onPress={() => navigation.navigate('EducationArticle', { articleId: article.id })}
                />
              ))}
              {articles.length > visibleCount && (
                <TouchableOpacity
                  style={[s.showAllBtn, { marginTop: 8, marginBottom: 20 }]}
                  onPress={() => setVisibleCount((prev) => prev + 5)}
                >
                  <Text style={s.showAllBtnText}>Xem thêm ({articles.length - visibleCount} bài nữa) ⬇️</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerGreet: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  headerIconBig: {
    width: 68,
    height: 68,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stats
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -14,
    borderRadius: 16,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: '#2563EB',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563EB',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerIcon: { fontSize: 16 },
  disclaimerText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 17,
  },
  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  // Filters
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2740',
  },
  countText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  // Featured card
  featCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  featLeft: {
    flex: 1,
    gap: 8,
  },
  featTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  featSummary: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
  },
  featFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  featMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  featEmoji: {
    fontSize: 60,
    marginLeft: 8,
  },
  // Article card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardAccent: {
    width: 5,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  cardEmojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardMetaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2740',
    lineHeight: 20,
  },
  cardSummary: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  quizPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  quizPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  readBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  readBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Empty
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  catScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  catCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCardText: {
    fontSize: 13,
    fontWeight: '700',
  },
  showAllBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  showAllBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  exploreHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0E7FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
});

