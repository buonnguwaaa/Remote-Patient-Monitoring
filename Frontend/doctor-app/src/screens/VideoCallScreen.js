import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createVideoSession, joinVideoSession, endVideoSession, getActiveVideoSession } from "../api/videoSessionApi";

export default function VideoCallScreen({ route, navigation }) {
  const { patientId, conversationId, videoSessionId: passedSessionId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(passedSessionId || null);
  const [joinUrl, setJoinUrl] = useState(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        let activeId = sessionId;

        // If no sessionId passed, create a new video session
        if (!activeId) {
          if (!patientId) {
            throw new Error("Thiếu thông tin bệnh nhân để bắt đầu cuộc gọi.");
          }

          // First check if there is an active session
          const activeRes = await getActiveVideoSession(conversationId);
          if (activeRes.ok && activeRes.body?.data) {
            activeId = activeRes.body.data.id;
          } else {
            const createRes = await createVideoSession(patientId, conversationId);
            if (!createRes.ok) {
              throw new Error(createRes.body?.error || "Không thể khởi tạo cuộc gọi video.");
            }
            activeId = createRes.body.data.id;
          }
        }

        setSessionId(activeId);

        // Join the session to get the Jitsi join URL
        const joinRes = await joinVideoSession(activeId);
        if (!joinRes.ok) {
          throw new Error(joinRes.body?.error || "Không thể tham gia cuộc gọi.");
        }

        const url = joinRes.body?.data?.joinUrl || joinRes.body?.joinUrl;
        if (url) {
          setJoinUrl(url);
          // Auto-open video call application
          Linking.openURL(url).catch(() => {
            setError("Không thể mở ứng dụng cuộc gọi. Vui lòng mở lại thủ công.");
          });
        } else {
          throw new Error("Không nhận được đường dẫn tham gia cuộc gọi.");
        }
      } catch (err) {
        setError(err.message || "Đã xảy ra lỗi khi chuẩn bị cuộc gọi.");
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [patientId, conversationId, sessionId]);

  const handleEndCall = async () => {
    if (sessionId) {
      try {
        setLoading(true);
        const endRes = await endVideoSession(sessionId);
        if (endRes.ok) {
          navigation.goBack();
        } else {
          throw new Error(endRes.body?.error || "Không thể tắt cuộc gọi.");
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    } else {
      navigation.goBack();
    }
  };

  const handleRejoin = () => {
    if (joinUrl) {
      Linking.openURL(joinUrl).catch(() => {});
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang thiết lập phòng cuộc gọi...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <Text style={styles.errorTitle}>Lỗi cuộc gọi video</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Ionicons name="videocam" size={40} color="#2563EB" />
        </View>

        <Text style={styles.title}>Cuộc gọi Video Bác sĩ</Text>
        <Text style={styles.subtitle}>
          Cuộc gọi video đang hoạt động trên hệ thống Jitsi Meet.
        </Text>
        <Text style={styles.hint}>
          Sau khi hoàn thành tư vấn, vui lòng nhấn "Kết thúc cuộc gọi" để tắt kết nối cho cả bệnh nhân.
        </Text>

        <View style={styles.actionRow}>
          {joinUrl && (
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleRejoin}>
              <Ionicons name="videocam-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Vào lại cuộc gọi</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleEndCall}>
            <Ionicons name="close-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.btnText}>Kết thúc cuộc gọi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4FF", justifyContent: "center", padding: 24 },
  center: { flex: 1, backgroundColor: "#F0F4FF", justifyContent: "center", alignItems: "center", padding: 24 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#4B5563", textAlign: "center", lineHeight: 20, marginBottom: 12 },
  hint: { fontSize: 12, color: "#9CA3AF", textAlign: "center", marginBottom: 28 },
  actionRow: { flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  btn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  btnPrimary: { backgroundColor: "#2563EB" },
  btnDanger: { backgroundColor: "#DC2626" },
  btnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  loadingText: { marginTop: 14, fontSize: 14, color: "#4B5563" },
  errorTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 16, marginBottom: 8, textAlign: "center" },
  errorText: { fontSize: 13, color: "#DC2626", textAlign: "center", marginBottom: 24 },
  backBtn: { backgroundColor: "#2563EB", paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 },
  backBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
