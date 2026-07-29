import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GUIDE_CATEGORIES = [
  { id: 'measurement', label: '1. Nhập & Lịch sử Chỉ số', icon: 'stats-chart', color: '#2563EB', bg: '#EFF6FF' },
  { id: 'medication', label: '2. Lịch uống thuốc', icon: 'medical', color: '#10B981', bg: '#ECFDF5' },
  { id: 'chat_call', label: '3. Nhắn tin & Gọi Bác sĩ', icon: 'chatbubbles', color: '#0284C7', bg: '#E0F2FE' },
  { id: 'alerts', label: '4. Cảnh báo khẩn cấp', icon: 'shield-checkmark', color: '#E11D48', bg: '#FFF1F2' },
  { id: 'education', label: '5. Bài viết & Trắc nghiệm', icon: 'book', color: '#D97706', bg: '#FEF3C7' },
  { id: 'account', label: '6. Hồ sơ & Sinh trắc học', icon: 'person', color: '#8B5CF6', bg: '#F5F3FF' },
];

const GUIDES_DATA = {
  measurement: [
    {
      step: 1,
      title: 'Bước 1: Chọn nhóm chỉ số và nhập kết quả đo',
      locationDesc: 'Tại tab "Theo dõi" ở thanh điều hướng dưới cùng ➔ Màn hình hiển thị 7 nhóm sinh hiệu (Huyết áp, Đường huyết, SpO2, Nhiệt độ, Nhịp tim, Nhịp thở, Thể trạng).',
      mockupType: 'grid_selection',
      userAction: 'Chạm chọn nhóm chỉ số (ví dụ: "Huyết áp") ➔ Điền chỉ số Tâm thu (SYS) và Tâm trương (DIA) ➔ Bấm nút "Lưu bản đo".',
      systemFeedback: 'Thẻ được chọn đổi sang màu xanh "Đang nhập". Khi bấm Lưu, thông báo "Lưu bản đo Huyết áp thành công!" xuất hiện.',
      screenFlow: ['Trang chủ', 'Tab Theo dõi', 'Chọn Huyết áp', 'Lưu bản đo'],
    },
    {
      step: 2,
      title: 'Bước 2: Xem lại Nhật ký & Đồ thị diễn tiến chỉ số',
      locationDesc: 'Tại tab "Theo dõi", chọn tab phụ "Lịch sử" ở góc trên màn hình.',
      mockupType: 'history_chart',
      userAction: 'Xem biểu đồ diễn tiến chỉ số theo mốc thời gian (7 ngày, 30 ngày) và lọc theo ngày đo cụ thể.',
      systemFeedback: 'Hệ thống vẽ biểu đồ đường trực quan kèm trạng thái phân loại màu (Bình thường / Vượt ngưỡng).',
      screenFlow: ['Tab Theo dõi', 'Tab phụ Lịch sử', 'Biểu đồ diễn tiến chỉ số'],
    },
  ],
  medication: [
    {
      step: 1,
      title: 'Bước 1: Theo dõi Lịch uống thuốc phân theo ca trong ngày',
      locationDesc: 'Tại Trang chủ hoặc tab "Thuốc" ➔ Danh sách đơn thuốc chia rõ theo ca (Sáng, Trưa, Tối).',
      mockupType: 'medication_card',
      userAction: 'Xem tên thuốc, liều dùng (ví dụ: Amlodipine 5mg - 1 viên sau ăn) và dặn dò của Bác sĩ.',
      systemFeedback: 'Ứng dụng tự động bật nhắc nhở Push Notification khi đến giờ uống thuốc.',
      screenFlow: ['Trang chủ', 'Lịch thuốc ca Tối', 'Chi tiết liều dùng'],
    },
    {
      step: 2,
      title: 'Bước 2: Đánh dấu xác nhận đã uống hết thuốc',
      locationDesc: 'Dưới danh sách thuốc mỗi ca có nút "Đánh dấu đã uống hết".',
      mockupType: 'confirm_med',
      userAction: 'Sau khi uống xong thuốc, bấm nút "Đánh dấu đã uống hết".',
      systemFeedback: 'Thẻ thuốc chuyển màu xanh lá hoàn tất. Hệ thống tự động báo cáo chỉ số tuân thủ cho Bác sĩ.',
      screenFlow: ['Lịch thuốc', 'Bấm xác nhận', 'Báo cáo Bác sĩ'],
    },
  ],
  chat_call: [
    {
      step: 1,
      title: 'Bước 1: Nhắn tin trực tiếp với Bác sĩ phụ trách',
      locationDesc: 'Tại thanh điều hướng dưới cùng ➔ Chạm vào tab "Tin nhắn" (Doctor Chat).',
      mockupType: 'doctor_chat',
      userAction: 'Nhập câu hỏi, mô tả triệu chứng hoặc đính kèm ảnh chụp kết quả đo gửi cho Bác sĩ.',
      systemFeedback: 'Tin nhắn gửi đi ngay lập tức. Bác sĩ phụ trách sẽ nhận thông báo và phản hồi trực tiếp.',
      screenFlow: ['Tab Tin nhắn', 'Khung chat Bác sĩ', 'Gửi tin nhắn / Hình ảnh'],
    },
    {
      step: 2,
      title: 'Bước 2: Cuộc gọi Video Telehealth trực tuyến với Bác sĩ',
      locationDesc: 'Trong khung chat Bác sĩ hoặc màn hình Cảnh báo ➔ Chạm vào biểu tượng Nút Gọi Video (videocam).',
      mockupType: 'video_call',
      userAction: 'Bấm "Khởi chạy cuộc gọi Video" để gặp mặt Bác sĩ trực tuyến khi cần tư vấn gấp.',
      systemFeedback: 'Màn hình cuộc gọi Video mở ra với đầy đủ nút Bật/Tắt Mic, Camera và thời gian cuộc gọi.',
      screenFlow: ['Khung chat / Cảnh báo', 'Bấm Nút Gọi Video', 'Màn hình Video Call'],
    },
  ],
  alerts: [
    {
      step: 1,
      title: 'Bước 1: Cảnh báo bất thường màu đỏ ở Trang chủ',
      locationDesc: 'Khi chỉ số nhập vào ở mức nguy hiểm (Huyết áp >= 180 mmHg), thẻ Cảnh báo màu đỏ nổi bật xuất hiện.',
      mockupType: 'red_alert',
      userAction: 'Nhấn vào thẻ Cảnh báo màu đỏ để xem mức độ rủi ro và các bước sơ cứu khẩn cấp.',
      systemFeedback: 'Màn hình hiển thị khuyến cáo y tế màu đỏ kèm số điện thoại tư vấn khẩn cấp.',
      screenFlow: ['Trang chủ', 'Thẻ Cảnh báo đỏ', 'Khuyến cáo khẩn cấp'],
    },
    {
      step: 2,
      title: 'Bước 2: Xử lý cảnh báo & Nhận chỉ đạo từ Bác sĩ',
      locationDesc: 'Trong màn hình chi tiết Cảnh báo ➔ Có nút "Gửi yêu cầu Bác sĩ hỗ trợ".',
      mockupType: 'alert_action',
      userAction: 'Bấm nút "Tư vấn Bác sĩ ngay" để Bác sĩ nhận chuông cảnh báo ưu tiên.',
      systemFeedback: 'Bác sĩ phụ trách nhận được thông báo ưu tiên cao nhất và liên hệ lại cho bạn.',
      screenFlow: ['Chi tiết Cảnh báo', 'Bấm Gọi Bác sĩ', 'Bác sĩ tiếp nhận xử lý'],
    },
  ],
  education: [
    {
      step: 1,
      title: 'Bước 1: Đọc bài viết Giáo dục Y tế chính thống',
      locationDesc: 'Tại thanh điều hướng dưới cùng ➔ Chạm vào tab "Giáo dục" (Education).',
      mockupType: 'edu_article',
      userAction: 'Chọn bài viết theo chủ đề (Ví dụ: "Chế độ ăn cho người Tăng huyết áp", "Kiểm soát Đường huyết").',
      systemFeedback: 'Nội dung bài viết y khoa chính thống được biên soạn bởi chuyên gia hiển thị đầy đủ.',
      screenFlow: ['Tab Giáo dục', 'Danh mục bài viết', 'Đọc bài viết y khoa'],
    },
    {
      step: 2,
      title: 'Bước 2: Làm Trắc nghiệm ngắn để củng cố kiến thức',
      locationDesc: 'Cuối mỗi bài viết hoặc danh mục có phần "Trắc nghiệm kiến thức".',
      mockupType: 'edu_quiz',
      userAction: 'Trả lời các câu hỏi trắc nghiệm nhanh 4 lựa chọn để kiểm tra mức độ hiểu bài.',
      systemFeedback: 'Hệ thống chấm điểm tức thì và đưa ra lời giải thích chi tiết cho từng câu hỏi.',
      screenFlow: ['Bài viết', 'Nút Bài Trắc nghiệm', 'Xem kết quả & Lời giải'],
    },
  ],
  account: [
    {
      step: 1,
      title: 'Bước 1: Bật Đăng nhập Sinh trắc học (Face ID / Vân tay)',
      locationDesc: 'Tại màn hình "Hồ sơ" ➔ Mục "Tài khoản & cài đặt" ➔ Hàng "Đăng nhập vân tay / Face ID".',
      mockupType: 'biometric_toggle',
      userAction: 'Gạt công tắc sang màu xanh để kích hoạt đăng nhập nhanh bằng Vân tay hoặc Face ID.',
      systemFeedback: 'Hệ thống xác thực sinh trắc học và hiển thị thông báo kích hoạt thành công.',
      screenFlow: ['Tab Hồ sơ', 'Tài khoản & cài đặt', 'Bật FaceID / Vân tay'],
    },
    {
      step: 2,
      title: 'Bước 2: Xem Thông báo nhắc nhở & Lịch sử hoạt động',
      locationDesc: 'Tại màn hình "Hồ sơ" ➔ Chọn "Lịch sử tài khoản" hoặc xem tab "Thông báo".',
      mockupType: 'account_history',
      userAction: 'Chạm vào "Lịch sử tài khoản" để xem danh sách thời gian đăng nhập và các sự kiện đã thực hiện.',
      systemFeedback: 'Màn hình hiển thị đầy đủ nhật ký thao tác và lịch sử thông báo của ứng dụng.',
      screenFlow: ['Tab Hồ sơ', 'Lịch sử tài khoản', 'Nhật ký sự kiện'],
    },
  ],
};

export default function UserGuideScreen({ navigation }) {
  const [activeCategory, setActiveCategory] = useState('measurement');
  const [searchQuery, setSearchQuery] = useState('');

  const guides = (GUIDES_DATA[activeCategory] || []).filter(g => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return g.title.toLowerCase().includes(q) || g.userAction.toLowerCase().includes(q);
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Hướng dẫn sử dụng chi tiết</Text>
          <Text style={styles.headerSubtitle}>Trợ lý tra cứu tính năng & Mô phỏng giao diện chuẩn</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm tính năng, bước thao tác..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Tabs Header */}
      <View style={styles.categoryTabSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {GUIDE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  isActive && { backgroundColor: cat.color, borderColor: cat.color },
                ]}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.categoryIconCircle, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : cat.bg }]}>
                  <Ionicons name={cat.icon} size={16} color={isActive ? '#FFFFFF' : cat.color} />
                </View>
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Guide Cards Content Scroll */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
        {guides.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>Không tìm thấy kết quả phù hợp với từ khóa "{searchQuery}"</Text>
          </View>
        ) : (
          guides.map((item) => (
            <View key={item.step} style={styles.guideCard}>
              {/* Step Title Header */}
              <View style={styles.guideHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{item.step}</Text>
                </View>
                <Text style={styles.guideTitle}>{item.title}</Text>
              </View>

              {/* Real App UI Mockup Visual Canvas */}
              <View style={styles.mockupContainer}>
                <View style={styles.mockupHeaderBar}>
                  <View style={styles.mockupDotRed} />
                  <View style={styles.mockupDotYellow} />
                  <View style={styles.mockupDotGreen} />
                  <Text style={styles.mockupTitleText}>Giao diện ứng dụng RPM</Text>
                </View>

                {/* 1. Grid Selection Mockup */}
                {item.mockupType === 'grid_selection' && (
                  <View style={styles.mockupBody}>
                    <Text style={styles.mockupSubtitle}>Loại chỉ số cần nhập</Text>
                    <View style={styles.mockupGrid}>
                      <View style={[styles.mockupTile, styles.mockupTileActive]}>
                        <MaterialCommunityIcons name="heart-pulse" size={22} color="#2563EB" />
                        <Text style={styles.mockupTileTitle}>Huyết áp</Text>
                        <Text style={styles.mockupTileBadge}>Đang nhập</Text>
                      </View>
                      <View style={styles.mockupTile}>
                        <Ionicons name="water" size={22} color="#64748B" />
                        <Text style={styles.mockupTileTitle}>Đường huyết</Text>
                      </View>
                      <View style={styles.mockupTile}>
                        <Ionicons name="pulse" size={22} color="#64748B" />
                        <Text style={styles.mockupTileTitle}>SpO2</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 2. History Chart Mockup */}
                {item.mockupType === 'history_chart' && (
                  <View style={styles.mockupBody}>
                    <Text style={styles.mockupSubtitle}>Biểu đồ diễn tiến Huyết áp (7 ngày)</Text>
                    <View style={styles.mockupChartBox}>
                      <View style={styles.mockupChartLine}>
                        <View style={[styles.chartBar, { height: 40 }]} />
                        <View style={[styles.chartBar, { height: 55 }]} />
                        <View style={[styles.chartBar, { height: 45 }]} />
                        <View style={[styles.chartBarActive, { height: 65 }]} />
                        <View style={[styles.chartBar, { height: 50 }]} />
                      </View>
                      <Text style={styles.mockupChartText}>Trung bình: 122/81 mmHg (Vùng an toàn)</Text>
                    </View>
                  </View>
                )}

                {/* 3. Input Form Mockup */}
                {item.mockupType === 'input_form' && (
                  <View style={styles.mockupBody}>
                    <Text style={styles.mockupSubtitle}>Chi tiết chỉ số đang nhập (Huyết áp)</Text>
                    <View style={styles.mockupInputRow}>
                      <View style={styles.mockupInputBox}>
                        <Text style={styles.mockupInputLabel}>Tâm thu (SYS)</Text>
                        <Text style={styles.mockupInputValue}>120 mmHg</Text>
                      </View>
                      <View style={styles.mockupInputBox}>
                        <Text style={styles.mockupInputLabel}>Tâm trương (DIA)</Text>
                        <Text style={styles.mockupInputValue}>80 mmHg</Text>
                      </View>
                    </View>
                    <View style={styles.mockupButton}>
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.mockupBtnText}>Lưu bản đo</Text>
                    </View>
                  </View>
                )}

                {/* 4. Medication Card Mockup */}
                {item.mockupType === 'medication_card' && (
                  <View style={styles.mockupBody}>
                    <View style={styles.mockupMedRow}>
                      <MaterialCommunityIcons name="pill" size={24} color="#10B981" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mockupMedTitle}>Thuốc buổi Tối</Text>
                        <Text style={styles.mockupMedSub}>Amlodipine 5mg • 1 viên sau ăn</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </View>
                  </View>
                )}

                {/* 5. Confirm Medication Mockup */}
                {item.mockupType === 'confirm_med' && (
                  <View style={styles.mockupBody}>
                    <View style={styles.mockupButtonSuccess}>
                      <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.mockupBtnText}>Đánh dấu đã uống hết</Text>
                    </View>
                  </View>
                )}

                {/* 6. Doctor Chat Mockup */}
                {item.mockupType === 'doctor_chat' && (
                  <View style={styles.mockupBody}>
                    <View style={styles.mockupChatBubbleUser}>
                      <Text style={styles.mockupChatTextUser}>Bác sĩ ơi, chỉ số Huyết áp chiều nay của tôi là 120/80 mmHg có ổn không ạ?</Text>
                    </View>
                    <View style={styles.mockupChatBubbleDoc}>
                      <Text style={styles.mockupChatTextDoc}>Chỉ số rất tốt bác nhé! Bác nhớ duy trì uống thuốc buổi tối đúng giờ.</Text>
                    </View>
                  </View>
                )}

                {/* 7. Video Call Mockup */}
                {item.mockupType === 'video_call' && (
                  <View style={styles.mockupBody}>
                    <View style={styles.mockupVideoScreen}>
                      <Ionicons name="videocam" size={32} color="#0284C7" />
                      <Text style={styles.mockupVideoTitle}>Cuộc gọi Video với BS. Trần Văn A</Text>
                      <View style={styles.mockupVideoControls}>
                        <View style={styles.mockupIconBtn}><Ionicons name="mic-outline" size={16} color="#FFF" /></View>
                        <View style={styles.mockupIconBtnRed}><Ionicons name="call-outline" size={16} color="#FFF" /></View>
                        <View style={styles.mockupIconBtn}><Ionicons name="videocam-outline" size={16} color="#FFF" /></View>
                      </View>
                    </View>
                  </View>
                )}

                {/* 8. Red Alert Card Mockup */}
                {item.mockupType === 'red_alert' && (
                  <View style={styles.mockupBody}>
                    <View style={styles.mockupAlertBox}>
                      <Ionicons name="warning" size={24} color="#E11D48" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mockupAlertTitle}>CẢNH BÁO 5 NGÀY GẦN NHẤT</Text>
                        <Text style={styles.mockupAlertSub}>Huyết áp 180/110 mmHg • Ưu tiên cao</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 9. Alert Action Mockup */}
                {item.mockupType === 'alert_action' && (
                  <View style={styles.mockupBody}>
                    <View style={styles.mockupCallBox}>
                      <Ionicons name="call" size={18} color="#FFFFFF" />
                      <Text style={styles.mockupBtnText}>Tư vấn Bác sĩ ngay</Text>
                    </View>
                  </View>
                )}

                {/* 10. Education Article Mockup */}
                {item.mockupType === 'edu_article' && (
                  <View style={styles.mockupBody}>
                    <View style={styles.mockupEduRow}>
                      <Ionicons name="book-outline" size={22} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mockupEduTitle}>Chế độ ăn DASH giảm Huyết áp</Text>
                        <Text style={styles.mockupEduSub}>Cẩm nang dinh dưỡng y khoa • Chuyên gia biên soạn</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 11. Education Quiz Mockup */}
                {item.mockupType === 'edu_quiz' && (
                  <View style={styles.mockupBody}>
                    <View style={styles.mockupQuizBox}>
                      <Text style={styles.mockupQuizTitle}>Câu hỏi: Mức Huyết áp nào được coi là bình thường?</Text>
                      <View style={styles.mockupQuizOptionActive}>
                        <Ionicons name="checkmark-circle" size={16} color="#166534" />
                        <Text style={styles.mockupQuizOptionText}>Dưới 120/80 mmHg (Chính xác)</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 12. Biometric Toggle Mockup */}
                {item.mockupType === 'biometric_toggle' && (
                  <View style={styles.mockupBody}>
                    <View style={styles.mockupAccountRow}>
                      <Ionicons name="finger-print-outline" size={22} color="#2563EB" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mockupAccountTitle}>Đăng nhập vân tay / Face ID</Text>
                        <Text style={styles.mockupAccountSub}>Sử dụng sinh trắc học để đăng nhập nhanh</Text>
                      </View>
                      <View style={styles.mockupSwitchActive}>
                        <View style={styles.mockupSwitchThumb} />
                      </View>
                    </View>
                  </View>
                )}

                {/* 13. Account History Mockup */}
                {item.mockupType === 'account_history' && (
                  <View style={styles.mockupBody}>
                    <View style={styles.mockupAccountRow}>
                      <Ionicons name="time-outline" size={20} color="#2563EB" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mockupAccountTitle}>Lịch sử tài khoản</Text>
                        <Text style={styles.mockupAccountSub}>Xem các hoạt động đã thực hiện trên tài khoản</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </View>
                  </View>
                )}
              </View>

              {/* Step Guidance Details */}
              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-sharp" size={16} color="#2563EB" />
                  <Text style={styles.detailText}>{item.locationDesc}</Text>
                </View>

                <View style={styles.actionBox}>
                  <Text style={styles.actionTitle}>👆 Thao tác người dùng:</Text>
                  <Text style={styles.actionDesc}>{item.userAction}</Text>
                </View>

                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackTitle}>⚡ Phản hồi ứng dụng:</Text>
                  <Text style={styles.feedbackDesc}>{item.systemFeedback}</Text>
                </View>

                {/* Navigation Breadcrumb Flow */}
                <View style={styles.flowBreadcrumb}>
                  <Text style={styles.flowTitle}>Sơ đồ chuyển màn hình:</Text>
                  <View style={styles.breadcrumbRow}>
                    {item.screenFlow.map((scr, idx) => (
                      <React.Fragment key={scr}>
                        <View style={styles.crumbChip}>
                          <Text style={styles.crumbText}>{scr}</Text>
                        </View>
                        {idx < item.screenFlow.length - 1 ? (
                          <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
                        ) : null}
                      </React.Fragment>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  categoryTabSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  categoryIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justify: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 30,
  },
  emptyBox: {
    alignItems: 'center',
    justify: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  guideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563EB',
    justify: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  guideTitle: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  mockupContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    marginBottom: 14,
  },
  mockupHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  mockupDotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  mockupDotYellow: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
  mockupDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  mockupTitleText: { fontSize: 11, fontWeight: '700', color: '#64748B', marginLeft: 6 },
  mockupBody: { padding: 14 },
  mockupSubtitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 10 },
  mockupGrid: { flexDirection: 'row', gap: 8 },
  mockupTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  mockupTileActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
  },
  mockupTileTitle: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  mockupTileBadge: { fontSize: 10, fontWeight: '800', color: '#2563EB' },
  mockupChartBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  mockupChartLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justify: 'space-around',
    width: '100%',
    height: 70,
    marginBottom: 8,
  },
  chartBar: { width: 14, backgroundColor: '#93C5FD', borderRadius: 4 },
  chartBarActive: { width: 16, backgroundColor: '#2563EB', borderRadius: 4 },
  mockupChartText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  mockupInputRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  mockupInputBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mockupInputLabel: { fontSize: 10, color: '#64748B' },
  mockupInputValue: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  mockupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  mockupButtonSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  mockupBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  mockupMedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 10,
  },
  mockupMedTitle: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  mockupMedSub: { fontSize: 11, color: '#047857', marginTop: 2 },
  mockupChatBubbleUser: {
    backgroundColor: '#0284C7',
    padding: 10,
    borderRadius: 14,
    borderBottomRightRadius: 2,
    alignSelf: 'flex-end',
    maxWidth: '85%',
    marginBottom: 8,
  },
  mockupChatTextUser: { color: '#FFF', fontSize: 12, lineHeight: 17 },
  mockupChatBubbleDoc: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 14,
    borderBottomLeftRadius: 2,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  mockupChatTextDoc: { color: '#0F172A', fontSize: 12, lineHeight: 17 },
  mockupVideoScreen: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  mockupVideoTitle: { color: '#FFF', fontSize: 12.5, fontWeight: '700' },
  mockupVideoControls: { flexDirection: 'row', gap: 14, marginTop: 4 },
  mockupIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  mockupIconBtnRed: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  mockupAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    gap: 10,
  },
  mockupAlertTitle: { fontSize: 12, fontWeight: '800', color: '#991B1B' },
  mockupAlertSub: { fontSize: 11, color: '#B91C1C', marginTop: 2 },
  mockupCallBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  mockupEduRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  mockupEduTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  mockupEduSub: { fontSize: 11, color: '#B45309', marginTop: 2 },
  mockupQuizBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  mockupQuizTitle: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  mockupQuizOptionActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    gap: 6,
  },
  mockupQuizOptionText: { fontSize: 11.5, fontWeight: '700', color: '#166534' },
  mockupAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  mockupAccountTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  mockupAccountSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  mockupSwitchActive: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    justify: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 2,
  },
  mockupSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  detailSection: { gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#475569', flex: 1, lineHeight: 18 },
  actionBox: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  actionTitle: { fontSize: 12, fontWeight: '700', color: '#1E40AF', marginBottom: 2 },
  actionDesc: { fontSize: 13, color: '#1E3A8A', lineHeight: 18 },
  feedbackBox: { backgroundColor: '#F0FDF4', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  feedbackTitle: { fontSize: 12, fontWeight: '700', color: '#166534', marginBottom: 2 },
  feedbackDesc: { fontSize: 13, color: '#14532D', lineHeight: 18 },
  flowBreadcrumb: { marginTop: 4 },
  flowTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  crumbChip: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  crumbText: { fontSize: 11, fontWeight: '600', color: '#334155' },
});
