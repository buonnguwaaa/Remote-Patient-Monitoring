import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { educationArticles, BADGE_CONFIG } from '../../data/educationArticles';

const DISCLAIMER = 'Nội dung chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ.';

const CATEGORY_COLORS = {
  bloodPressure: { from: '#FF6B6B', to: '#EE5A24', light: '#FFF0F0' },
  glucose: { from: '#667EEA', to: '#764BA2', light: '#F0F0FF' },
  general: { from: '#11998E', to: '#2196F3', light: '#F0FFF9' },
  lifestyle: { from: '#F7971E', to: '#FFD200', light: '#FFFBF0' },
  medication: { from: '#A855F7', to: '#EC4899', light: '#FFF0FF' },
};

function ContentBlock({ block }) {
  if (block.type === 'paragraph') {
    return <Text style={s.paragraph}>{block.text}</Text>;
  }

  if (block.type === 'bullet') {
    return (
      <View style={s.bulletBlock}>
        {block.title && <Text style={s.bulletTitle}>{block.title}</Text>}
        {block.items?.map((item, idx) => (
          <View key={idx} style={s.bulletRow}>
            <View style={s.bulletDotWrap}>
              <View style={s.bulletDotCircle} />
            </View>
            <Text style={s.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (block.type === 'note') {
    return (
      <View style={s.noteBox}>
        <Text style={s.noteIcon}>💡</Text>
        <Text style={s.noteText}>{block.text}</Text>
      </View>
    );
  }

  return null;
}

export default function EducationArticleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { articleId } = route.params || {};

  const article = educationArticles.find((a) => a.id === articleId);

  if (!article) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 60 }}>😕</Text>
        <Text style={{ fontSize: 16, color: '#9CA3AF', marginTop: 12 }}>Không tìm thấy bài học.</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={s.primaryBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const badge = BADGE_CONFIG[article.diseaseType] || {};
  const colors = CATEGORY_COLORS[article.diseaseType] || CATEGORY_COLORS.general;
  const emoji = article.emoji || badge.emoji || '📖';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4FF' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ─── COLORED HERO HEADER ─── */}
        <View style={[s.hero, { backgroundColor: colors.from }]}>
          {/* Back */}
          <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={s.backText}>Danh sách bài học</Text>
          </TouchableOpacity>

          {/* Meta row */}
          <View style={s.heroMeta}>
            <View style={[s.heroBadge]}>
              <Text style={s.heroBadgeText}>{badge.label || article.diseaseType}</Text>
            </View>
            <View style={s.heroTime}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={s.heroTimeText}>{article.estimatedMinutes} phút đọc</Text>
            </View>
          </View>

          {/* Title + emoji */}
          <View style={s.heroContent}>
            <Text style={s.heroTitle}>{article.title}</Text>
            <Text style={s.heroEmoji}>{emoji}</Text>
          </View>

          <Text style={s.heroSummary}>{article.summary}</Text>

          {/* Tags */}
          {article.tags?.length > 0 && (
            <View style={s.tagsRow}>
              {article.tags.map((tag, i) => (
                <View key={i} style={s.tag}>
                  <Text style={s.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── READING PROGRESS BAR (decorative) ─── */}
        <View style={s.progressWrap}>
          <Ionicons name="book-outline" size={14} color="#6B7280" />
          <Text style={s.progressText}>Bài viết · {article.content?.length || 0} phần nội dung</Text>
        </View>

        {/* ─── CONTENT ─── */}
        <View style={s.contentCard}>
          {article.content?.map((block, idx) => (
            <ContentBlock key={idx} block={block} />
          ))}
        </View>

        {/* ─── DISCLAIMER ─── */}
        <View style={s.disclaimer}>
          <Text style={{ fontSize: 16 }}>⚕️</Text>
          <Text style={s.disclaimerText}>{DISCLAIMER}</Text>
        </View>

        {/* ─── QUIZ TEASER ─── */}
        {article.quiz && article.quiz.length > 0 && (
          <TouchableOpacity
            style={[s.quizTeaser, { backgroundColor: colors.from }]}
            onPress={() => navigation.navigate('EducationQuiz', { articleId: article.id })}
            activeOpacity={0.85}
          >
            <View style={s.quizTeaserLeft}>
              <Text style={s.quizTeaserEmoji}>🧠</Text>
              <View>
                <Text style={s.quizTeaserTitle}>Kiểm tra kiến thức</Text>
                <Text style={s.quizTeaserSub}>{article.quiz.length} câu hỏi · Xem giải thích ngay</Text>
              </View>
            </View>
            <View style={s.quizTeaserArrow}>
              <Ionicons name="arrow-forward" size={20} color={colors.from} />
            </View>
          </TouchableOpacity>
        )}

        {/* ─── BACK BUTTON ─── */}
        <View style={s.backBtnWrap}>
          <TouchableOpacity style={s.outlineBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={16} color="#2563EB" />
            <Text style={s.outlineBtnText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  heroTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroTimeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    flex: 1,
    marginRight: 10,
  },
  heroEmoji: {
    fontSize: 52,
    marginTop: -4,
  },
  heroSummary: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 21,
    marginTop: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  // Progress
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Content card
  contentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    gap: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  paragraph: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 25,
  },
  bulletBlock: {
    gap: 8,
  },
  bulletTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2740',
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bulletDotWrap: {
    paddingTop: 8,
  },
  bulletDotCircle: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  bulletText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    flex: 1,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FBBF24',
  },
  noteIcon: {
    fontSize: 18,
    marginTop: -1,
  },
  noteText: {
    fontSize: 13,
    color: '#78350F',
    flex: 1,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },
  // Quiz teaser
  quizTeaser: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  quizTeaserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quizTeaserEmoji: {
    fontSize: 34,
  },
  quizTeaserTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quizTeaserSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  quizTeaserArrow: {
    width: 38,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Buttons
  backBtnWrap: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
