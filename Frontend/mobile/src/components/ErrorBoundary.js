import React, { Component } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.toString() || "Lỗi không xác định";
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.contentContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
            </View>

            <Text style={styles.title}>Đã xảy ra lỗi ngoài ý muốn</Text>
            <Text style={styles.subtitle}>
              Ứng dụng đã gặp sự cố không thể tự khắc phục. Vui lòng thử nhấn "Tải lại" bên dưới để tiếp tục.
            </Text>

            <View style={styles.errorBox}>
              <Text style={styles.errorBoxTitle}>Chi tiết lỗi:</Text>
              <ScrollView nestedScrollEnabled style={styles.errorScroll}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                {this.state.error?.stack ? (
                  <Text style={styles.stackText}>{this.state.error.stack}</Text>
                ) : null}
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Ionicons name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Tải lại</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconContainer: {
    marginBottom: 20,
    backgroundColor: "#FEE2E2",
    borderRadius: 50,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  errorBox: {
    width: "100%",
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    maxHeight: 250,
  },
  errorBoxTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 8,
  },
  errorScroll: {
    flexGrow: 0,
  },
  errorText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#FCA5A5",
    fontWeight: "bold",
    marginBottom: 6,
  },
  stackText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#D1D5DB",
    lineHeight: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
