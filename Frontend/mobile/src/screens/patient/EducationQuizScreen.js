import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { educationArticles, BADGE_CONFIG } from '../../data/educationArticles';

const CATEGORY_COLORS = {
  bloodPressure: { from: '#FF6B6B', to: '#EE5A24', light: '#FFF0F0' },
  glucose: { from: '#667EEA', to: '#764BA2', light: '#F0F0FF' },
  general: { from: '#11998E', to: '#2196F3', light: '#F0FFF9' },
  lifestyle: { from: '#F7971E', to: '#FFD200', light: '#FFFBF0' },
  medication: { from: '#A855F7', to: '#EC4899', light: '#FFF0FF' },
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function EducationQuizScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { articleId } = route.params || {};

  const article = educationArticles.find((a) => a.id === articleId);
  const quiz = article?.quiz || [];
  const badge = BADGE_CONFIG[article?.diseaseType] || {};
  const colors = CATEGORY_COLORS[article?.diseaseType] || CATEGORY_COLORS.general;
  const emoji = article?.emoji || badge.emoji || '📖';

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!article || quiz.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 60 }}>❓</Text>
        <Text style={{ fontSize: 16, color: '#9CA3AF', marginTop: 12 }}>Bài này không có quiz.</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={s.primaryBtnText}>Quay lại bài học</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const correctCount = quiz.reduce(
    (acc, q, idx) => (answers[idx] === q.correctIndex ? acc + 1 : acc),
    0
  );
  const allAnswered = Object.keys(answers).length === quiz.length;
  const answeredCount = Object.keys(answers).length;
  const pct = correctCount / quiz.length;

  const scoreEmoji = pct === 1 ? '🏆' : pct >= 0.67 ? '🎉' : pct >= 0.34 ? '👍' : '📖';
  const scoreMsg =
    pct === 1
      ? 'Xuất sắc! Bạn trả lời đúng tất cả!'
      : pct >= 0.67
      ? 'Tốt lắm! Bạn đã hiểu phần lớn nội dung.'
      : pct >= 0.34
      ? 'Cố thêm chút nữa nhé! Đọc lại bài để nắm rõ hơn.'
      : 'Hãy đọc lại bài để nắm vững kiến thức nhé.';

  const scoreColor = pct === 1 ? '#16A34A' : pct >= 0.67 ? '#D97706' : '#DC2626';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4FF' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>

        {/* ─── HERO ─── */}
        <View style={[s.hero, { backgroundColor: colors.from }]}>
          <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={s.backText}>Quay lại bài học</Text>
          </TouchableOpacity>

          <View style={s.heroContent}>
            <View>
              <Text style={s.heroLabel}>Quiz bài học</Text>
              <Text style={s.heroTitle} numberOfLines={2}>{article.title}</Text>
              <Text style={s.heroSub}>{quiz.length} câu hỏi · Chọn đáp án đúng nhất</Text>
            </View>
            <Text style={s.heroEmoji}>{emoji}</Text>
          </View>
        </View>

        {/* ─── PROGRESS BAR ─── */}
        {!submitted && (
          <View style={s.progressCard}>
            <View style={s.progressTop}>
              <Text style={s.progressLabel}>Đã trả lời</Text>
              <Text style={s.progressCount}>{answeredCount}/{quiz.length}</Text>
            </View>
            <View style={s.progressBar}>
              <View
                style={[
                  s.progressFill,
                  { width: `${(answeredCount / quiz.length) * 100}%`, backgroundColor: colors.from },
                ]}
              />
            </View>
          </View>
        )}

        {/* ─── SCORE CARD ─── */}
        {submitted && (
          <View style={[s.scoreCard, { borderColor: scoreColor }]}>
            <Text style={s.scoreEmoji}>{scoreEmoji}</Text>
            <Text style={[s.scoreNumber, { color: scoreColor }]}>
              {correctCount}/{quiz.length}
            </Text>
            <Text style={s.scoreLabel}>câu đúng</Text>
            <Text style={s.scoreMsg}>{scoreMsg}</Text>
            {/* Score dots */}
            <View style={s.scoreDots}>
              {quiz.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    s.scoreDot,
                    {
                      backgroundColor:
                        answers[idx] === quiz[idx].correctIndex ? '#16A34A' : '#DC2626',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* ─── QUESTIONS ─── */}
        {quiz.map((q, qIdx) => {
          const selected = answers[qIdx];
          const isAnswered = selected !== undefined;

          return (
            <View key={qIdx} style={s.questionCard}>
              {/* Question header */}
              <View style={[s.questionNum, { backgroundColor: colors.light }]}>
                <Text style={[s.questionNumText, { color: colors.from }]}>
                  Câu {qIdx + 1}
                </Text>
              </View>
              <Text style={s.questionText}>{q.question}</Text>

              {/* Options */}
              <View style={s.optionsWrap}>
                {q.options.map((opt, oIdx) => {
                  let style = s.option;
                  let letterBg = '#F3F4F6';
                  let letterColor = '#6B7280';
                  let textColor = '#374151';
                  let rightIcon = null;

                  if (submitted) {
                    if (oIdx === q.correctIndex) {
                      style = [s.option, s.optionCorrect];
                      letterBg = '#059669';
                      letterColor = '#fff';
                      textColor = '#065F46';
                      rightIcon = <Text style={s.resultIcon}>✅</Text>;
                    } else if (oIdx === selected && selected !== q.correctIndex) {
                      style = [s.option, s.optionWrong];
                      letterBg = '#DC2626';
                      letterColor = '#fff';
                      textColor = '#7F1D1D';
                      rightIcon = <Text style={s.resultIcon}>❌</Text>;
                    } else {
                      style = [s.option, s.optionDimmed];
                    }
                  } else if (selected === oIdx) {
                    style = [s.option, { borderColor: colors.from, backgroundColor: colors.light }];
                    letterBg = colors.from;
                    letterColor = '#fff';
                    textColor = '#1A2740';
                  }

                  return (
                    <TouchableOpacity
                      key={oIdx}
                      style={style}
                      onPress={() => {
                        if (submitted) return;
                        setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
                      }}
                      activeOpacity={submitted ? 1 : 0.75}
                    >
                      <View style={[s.optionLetter, { backgroundColor: letterBg }]}>
                        <Text style={[s.optionLetterText, { color: letterColor }]}>
                          {OPTION_LABELS[oIdx]}
                        </Text>
                      </View>
                      <Text style={[s.optionText, { color: textColor, flex: 1 }]}>{opt}</Text>
                      {rightIcon}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Explanation */}
              {submitted && (
                <View style={s.explanationBox}>
                  <Text style={s.expEmoji}>💡</Text>
                  <Text style={s.explanationText}>{q.explanation}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* ─── ACTIONS ─── */}
        <View style={s.actions}>
          {!submitted ? (
            <TouchableOpacity
              style={[
                s.submitBtn,
                { backgroundColor: allAnswered ? colors.from : '#D1D5DB' },
              ]}
              onPress={() => { if (allAnswered) setSubmitted(true); }}
              activeOpacity={allAnswered ? 0.85 : 1}
            >
              <Text style={s.submitBtnText}>
                {allAnswered
                  ? '🚀 Nộp bài và xem kết quả'
                  : `⏳ Còn ${quiz.length - answeredCount} câu chưa chọn`}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={s.resultActions}>
              <TouchableOpacity
                style={[s.outlineBtn, { borderColor: colors.from }]}
                onPress={() =>
                  navigation.navigate('EducationArticle', { articleId: article.id })
                }
              >
                <Text style={[s.outlineBtnText, { color: colors.from }]}>📖 Đọc lại bài</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.from }]}
                onPress={() => navigation.navigate('EducationHome')}
              >
                <Text style={s.primaryBtnText}>🏠 Về trang giáo dục</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
    marginBottom: 18,
  },
  backText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 27,
    maxWidth: '78%',
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },
  heroEmoji: {
    fontSize: 50,
  },
  // Progress
  progressCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  progressCount: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  // Score
  scoreCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2.5,
    elevation: 4,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    gap: 4,
  },
  scoreEmoji: {
    fontSize: 52,
    marginBottom: 4,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 54,
  },
  scoreLabel: {
    fontSize: 15,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  scoreMsg: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  scoreDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  scoreDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // Question
  questionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  questionNum: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  questionNumText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2740',
    lineHeight: 23,
    marginBottom: 14,
  },
  optionsWrap: {
    gap: 9,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 13,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionCorrect: {
    backgroundColor: '#D1FAE5',
    borderColor: '#059669',
  },
  optionWrong: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  optionDimmed: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.5,
  },
  optionLetter: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: '800',
  },
  optionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultIcon: {
    fontSize: 18,
  },
  // Explanation
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FBBF24',
  },
  expEmoji: {
    fontSize: 18,
    marginTop: -1,
  },
  explanationText: {
    fontSize: 13,
    color: '#78350F',
    flex: 1,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Actions
  actions: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultActions: {
    gap: 10,
  },
  outlineBtn: {
    borderWidth: 2.5,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    elevation: 3,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
