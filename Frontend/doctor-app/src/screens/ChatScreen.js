import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useIsFocused } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getMyPatients } from "../api/patientApi";
import { getConversations, ensureConversation } from "../api/chatApi";

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadConversations = useCallback(async (isSilent = false) => {
    if (!currentUserId) {
      setError("Không tìm thấy thông tin tài khoản bác sĩ.");
      setLoading(false);
      return;
    }

    if (!isSilent) {
      setLoading(true);
    }
    setError(null);

    try {
      // Single parallel fetch — patients + conversations (with lastMessage embedded)
      const [patientsRes, convsRes] = await Promise.all([
        getMyPatients(),
        getConversations(50),
      ]);

      if (!patientsRes.ok) {
        throw new Error(patientsRes.body?.error || "Không thể tải danh sách bệnh nhân");
      }
      if (!convsRes.ok) {
        throw new Error(convsRes.body?.error || "Không thể tải danh sách cuộc trò chuyện");
      }

      const patients = patientsRes.body?.data || [];
      const convList = convsRes.body?.data?.conversations || [];

      const patientMap = new Map(patients.map((p) => [p.patientId, p]));

      const previews = convList.map((conversation) => {
        const otherParticipantId =
          conversation.participants?.find((p) => p.userId !== currentUserId)?.userId ||
          conversation.participants?.[0]?.userId ||
          null;

        const patient = otherParticipantId ? patientMap.get(otherParticipantId) : null;

        // lastMessage is now embedded by the backend — no extra API call needed
        const lastMessage = conversation.lastMessage || null;

        // Calculate unread count from participant checkpoint
        let unreadCount = 0;
        const myParticipant = conversation.participants?.find(
          (p) => p.userId === currentUserId
        );
        const lastReadId = myParticipant?.lastReadMessageId;

        if (lastMessage && lastMessage.senderId !== currentUserId) {
          // Simple heuristic: if lastReadId doesn't match lastMessage id, there's at least 1 unread
          if (!lastReadId || lastReadId !== lastMessage.id) {
            unreadCount = 1; // We don't have exact count without fetching all messages
          }
        }

        return {
          conversationId: conversation.id,
          patientId: otherParticipantId,
          patientName: patient?.patientName || "Bệnh nhân",
          gender: patient?.gender || "Khác",
          patientCode: patient?.patientCode || patient?.patientPublicId || "N/A",
          lastMessage,
          unreadCount,
          updatedAt: lastMessage?.createdAt || conversation.updatedAt || conversation.createdAt,
        };
      });

      // Sort newest chats first
      previews.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      // Deduplicate by patientId
      const seen = new Set();
      const deduped = [];
      previews.forEach((item) => {
        const key = item.patientId || item.conversationId;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(item);
        }
      });

      setConversations(deduped);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi khi tải danh sách hội thoại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  // Handle auto-redirection if patientId parameter is provided in route
  useEffect(() => {
    if (isFocused && route.params?.patientId) {
      const patientId = route.params.patientId;
      setRedirecting(true);

      const redirect = async () => {
        try {
          const res = await ensureConversation(patientId);
          if (res.ok) {
            const conversation = res.body?.data || {};
            navigation.setParams({ patientId: undefined });
            navigation.navigate("ChatDetail", {
              patientId,
              conversationId: conversation.id,
            });
          } else {
            throw new Error("Không thể tạo hoặc mở phòng chat.");
          }
        } catch (err) {
          console.error("Auto redirection failed:", err);
          setError("Không thể mở phòng chat tự động. Vui lòng chọn từ danh sách.");
        } finally {
          setRedirecting(false);
        }
      };

      redirect();
    }
  }, [route.params?.patientId, isFocused, navigation]);

  // Fetch conversations when screen focuses
  useEffect(() => {
    if (isFocused && !route.params?.patientId) {
      loadConversations();
    }
  }, [isFocused, route.params?.patientId, loadConversations]);

  // Polling for updates while screen is focused
  useEffect(() => {
    if (!isFocused || redirecting || route.params?.patientId) {
      return undefined;
    }

    const interval = setInterval(() => {
      loadConversations(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [isFocused, redirecting, route.params?.patientId, loadConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations(true);
  };

  const handleOpenChat = (item) => {
    navigation.navigate("ChatDetail", {
      patientId: item.patientId,
      conversationId: item.conversationId,
      patientName: item.patientName,
    });
  };

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarColors = (gender) => {
    if (gender === "Nam") {
      return { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" };
    } else if (gender === "Nữ") {
      return { bg: "#FDF2F8", text: "#DB2777", border: "#FBCFE8" };
    }
    return { bg: "#F3F4F6", text: "#4B5563", border: "#E5E7EB" };
  };

  const normalizePreview = (message, isMe) => {
    if (!message) return "Chưa có tin nhắn";

    const textContent = message.content || "";

    if (textContent.includes('"type":"SYSTEM_CALL_STARTED"')) {
      return "📞 Bác sĩ đang gọi video...";
    } else if (textContent.includes('"type":"SYSTEM_CALL_ENDED"')) {
      return "📞 Cuộc gọi video đã kết thúc";
    } else if (textContent.includes('"type":"video_call_invite"')) {
      return "📞 Lời mời gọi video";
    } else if (textContent.includes('"type":"video_call_ended"')) {
      return "📞 Cuộc gọi video đã kết thúc";
    } else if (textContent.includes('"type":"SYSTEM_')) {
      return "📞 Cuộc gọi video";
    }

    const content = String(textContent).replace(/\s+/g, " ").trim();
    if (!content) return "Tin nhắn không có nội dung";
    const prefix = isMe ? "Bạn: " : "";
    return prefix + content;
  };

  const formatListTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.patientCode.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  if (redirecting) {
    return (
      <SafeAreaView style={styles.centerBox} edges={["left", "right"]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang chuẩn bị cuộc trò chuyện...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Tìm kiếm bệnh nhân hoặc mã..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải các cuộc trò chuyện...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadConversations()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : filteredConversations.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={54} color="#9CA3AF" />
              <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
              <Text style={styles.emptySubText}>
                Bạn có thể bắt đầu nhắn tin bằng cách chọn một bệnh nhân từ màn hình "Hồ sơ bệnh nhân".
              </Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={({ item }) => {
            const colors = getAvatarColors(item.gender);
            const isMe = item.lastMessage?.senderId === currentUserId;
            const previewText = normalizePreview(item.lastMessage, isMe);
            const timeText = formatListTime(item.updatedAt);
            const hasUnread = item.unreadCount > 0;

            return (
              <TouchableOpacity
                style={styles.chatCard}
                onPress={() => handleOpenChat(item)}
                activeOpacity={0.7}
              >
                {/* Avatar Initials */}
                <View style={[styles.avatarCircle, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.avatarText, { color: colors.text }]}>
                    {getInitials(item.patientName)}
                  </Text>
                </View>

                {/* Information */}
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeaderRow}>
                    <Text style={styles.patientName} numberOfLines={1}>
                      {item.patientName}
                    </Text>
                    <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>
                      {timeText}
                    </Text>
                  </View>

                  <View style={styles.chatDetailRow}>
                    <Text
                      style={[styles.previewText, hasUnread && styles.previewTextUnread]}
                      numberOfLines={1}
                    >
                      {previewText}
                    </Text>
                    {hasUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCountText}>N</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F6FF" },
  searchContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#1F2937" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#4B5563" },
  errorText: { marginTop: 12, fontSize: 14, color: "#DC2626", textAlign: "center" },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, marginTop: 40 },
  emptyText: { marginTop: 16, fontSize: 16, color: "#1F2937", fontWeight: "700", textAlign: "center" },
  emptySubText: { marginTop: 8, fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 18 },
  listContent: { paddingBottom: 24 },
  chatCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700" },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  patientName: { fontSize: 15, fontWeight: "700", color: "#1F2937", flex: 1, marginRight: 8 },
  timeText: { fontSize: 12, color: "#9CA3AF" },
  timeTextUnread: { color: "#2563EB", fontWeight: "600" },
  chatDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewText: { fontSize: 13, color: "#6B7280", flex: 1, marginRight: 12 },
  previewTextUnread: { color: "#111827", fontWeight: "600" },
  unreadBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadCountText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
