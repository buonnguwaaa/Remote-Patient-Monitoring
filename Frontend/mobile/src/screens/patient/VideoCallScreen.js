import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { joinVideoSession, rejectVideoSession } from "../../api/videoSessionApi";

export default function VideoCallScreen({ route, navigation }) {
  const { videoSessionId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinUrl, setJoinUrl] = useState(null);

  useEffect(() => {
    if (!videoSessionId) {
      setError("Không tìm thấy thông tin cuộc gọi.");
      setLoading(false);
      return;
    }

    joinVideoSession(videoSessionId)
      .then((data) => {
        const url = data?.joinUrl;
        if (url) {
          setJoinUrl(url);
          // Auto-open Jitsi app or browser
          Linking.openURL(url).catch(() => {
            setError("Không thể mở ứng dụng gọi video. Vui lòng thử lại.");
          });
        } else {
          setError("Cuộc gọi không khả dụng hoặc đã kết thúc.");
        }
      })
      .catch((err) => {
        setError(err.message || "Lỗi kết nối cuộc gọi.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [videoSessionId]);

  const handleReject = () => {
    if (videoSessionId) {
      rejectVideoSession(videoSessionId).catch(() => {});
    }
    navigation.goBack();
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
        <Text style={styles.loadingText}>Đang kết nối cuộc gọi...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <Text style={styles.errorTitle}>Không thể tham gia cuộc gọi</Text>
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
        {/* Icon */}
        <View style={styles.iconWrapper}>
          <Ionicons name="videocam" size={40} color="#2563EB" />
        </View>

        <Text style={styles.title}>Cuộc gọi Video</Text>
        <Text style={styles.subtitle}>
          Cuộc gọi đang diễn ra trong ứng dụng Jitsi Meet hoặc trình duyệt.
        </Text>
        <Text style={styles.hint}>
          Sau khi kết thúc, vui lòng bấm "Đóng" để trở về ứng dụng.
        </Text>

        <View style={styles.actionRow}>
          {joinUrl && (
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleRejoin}>
              <Ionicons name="videocam-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Mở lại cuộc gọi</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleReject}>
            <Ionicons name="close-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.btnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    padding: 24,
  },
  center: {
    flex: 1,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
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
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 28,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnPrimary: {
    backgroundColor: "#2563EB",
  },
  btnDanger: {
    backgroundColor: "#DC2626",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: "#4B5563",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
