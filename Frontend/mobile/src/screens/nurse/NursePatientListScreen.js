import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../../hooks/useAuth";
import { useNursePatientListData } from "../../hooks/useNursePatientListData";
import NursePatientCard from "../../components/NursePatientCard";

const ListHeader = React.memo(
  ({
    search,
    setSearch,
    filter,
    setFilter,
    nurseName,
    totalPatients,
    patientsWithAlerts,
    loadError,
    loadNotice,
  }) => {
    return (
      <View>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Bệnh nhân được theo dõi</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loadError ? (
          <View style={styles.inlineErrorCard}>
            <Ionicons name="warning-outline" size={18} color="#B91C1C" />
            <Text style={styles.inlineErrorText}>{loadError}</Text>
          </View>
        ) : null}

        {loadNotice ? (
          <View style={styles.inlineNoticeCard}>
            <Ionicons name="information-circle-outline" size={18} color="#B45309" />
            <Text style={styles.inlineNoticeText}>{loadNotice}</Text>
          </View>
        ) : null}

        <View style={styles.nurseBar}>
          <View style={styles.nurseLeft}>
            <View style={styles.nurseAvatar}>
              <FontAwesome5 name="user-nurse" size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.nurseLabel}>Điều dưỡng</Text>
              <Text style={styles.nurseName}>{nurseName}</Text>
            </View>
          </View>
          <View style={styles.nurseSummary}>
            <Text style={styles.summaryNumber}>{totalPatients}</Text>
            <Text style={styles.summaryLabel}>bệnh nhân</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCardPrimary}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryIconPrimary}>
                <Ionicons name="people-outline" size={18} color="#2563EB" />
              </View>
              <Text style={styles.summaryTag}>Đang theo dõi</Text>
            </View>
            <Text style={styles.summaryBig}>{totalPatients}</Text>
            <Text style={styles.summarySub}>Bệnh nhân đang được phân công cho bạn</Text>
          </View>

          <View style={styles.summaryCardAlert}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryIconAlert}>
                <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
              </View>
              <Text style={styles.summaryTagAlert}>Cảnh báo</Text>
            </View>
            <Text style={styles.summaryBig}>{patientsWithAlerts}</Text>
            <Text style={styles.summarySub}>Bệnh nhân đang có cảnh báo mức cao</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên bệnh nhân..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity style={styles.filterBtn} disabled>
            <Ionicons name="options-outline" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === "all" && styles.filterTabTextActive,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === "alerts" && styles.filterTabActive]}
            onPress={() => setFilter("alerts")}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === "alerts" && styles.filterTabTextActive,
              ]}
            >
              Có cảnh báo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === "stable" && styles.filterTabActive]}
            onPress={() => setFilter("stable")}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === "stable" && styles.filterTabTextActive,
              ]}
            >
              Ổn định
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

export default function NursePatientListScreen() {
  const { user } = useAuth() || {};
  const {
    nurseProfile,
    patients,
    loading,
    refreshing,
    loadError,
    loadNotice,
    loadPatients,
  } = useNursePatientListData(user);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const deferredSearch = useDeferredValue(search);

  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [loadPatients])
  );

  const totalPatients = patients.length;
  const patientsWithAlerts = useMemo(() => {
    return patients.filter((patient) => patient.alertsSummary.high > 0).length;
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return patients.filter((patient) => {
      const haystack = [
        patient.user.name,
        patient.patientCode,
        patient.patientInfo.insuranceNumber,
        patient.patientInfo.CCCD,
      ]
        .join(" ")
        .toLowerCase();

      if (normalizedSearch && !haystack.includes(normalizedSearch)) {
        return false;
      }

      if (filter === "alerts") return patient.alertsSummary.high > 0;
      if (filter === "stable") return patient.alertsSummary.high === 0;
      return true;
    });
  }, [deferredSearch, filter, patients]);

  const emptyTitle =
    totalPatients === 0 ? "Chưa có bệnh nhân được phân công" : "Không tìm thấy bệnh nhân";
  const emptySubtitle =
    totalPatients === 0
      ? "Khi có phân công mới từ hệ thống, danh sách sẽ hiển thị tại đây."
      : "Kiểm tra lại từ khóa tìm kiếm hoặc bộ lọc.";

  const handleRefresh = useCallback(() => {
    loadPatients({ showLoader: false, showRefresh: true });
  }, [loadPatients]);

  const handlePatientPress = useCallback(() => {}, []);

  const renderItem = useCallback(({ item }) => {
    return <NursePatientCard patient={item} onPress={handlePatientPress} />;
  }, [handlePatientPress]);

  const renderEmpty = useCallback(() => {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name={totalPatients === 0 ? "people-outline" : "search-outline"}
          size={26}
          color="#9CA3AF"
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptySub}>{emptySubtitle}</Text>
      </View>
    );
  }, [emptySubtitle, emptyTitle, totalPatients]);

  if (loading && totalPatients === 0) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.stateTitle}>Đang tải danh sách bệnh nhân</Text>
          <Text style={styles.stateSubtitle}>
            Hệ thống đang đồng bộ dữ liệu thật từ máy chủ.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!loading && totalPatients === 0 && loadError) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <View style={styles.stateCard}>
          <Ionicons name="cloud-offline-outline" size={34} color="#B91C1C" />
          <Text style={styles.stateTitle}>Không tải được trang nurse</Text>
          <Text style={styles.stateSubtitle}>{loadError}</Text>
          <TouchableOpacity style={styles.stateButton} onPress={() => loadPatients()}>
            <Text style={styles.stateButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredPatients}
        keyExtractor={(item, index) => item.user._id || item.patientCode || `patient-${index}`}
        renderItem={renderItem}
        ListHeaderComponent={
          <ListHeader
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            nurseName={nurseProfile.name}
            totalPatients={totalPatients}
            patientsWithAlerts={patientsWithAlerts}
            loadError={loadError}
            loadNotice={loadNotice}
          />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#2563EB"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F6FF",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  stateContainer: {
    flex: 1,
    backgroundColor: "#F2F6FF",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  stateCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  stateTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  stateSubtitle: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
    lineHeight: 20,
  },
  stateButton: {
    marginTop: 16,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stateButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  inlineErrorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  inlineErrorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 12,
    lineHeight: 18,
  },
  inlineNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  inlineNoticeText: {
    flex: 1,
    color: "#B45309",
    fontSize: 12,
    lineHeight: 18,
  },
  nurseBar: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  nurseLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  nurseAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  nurseLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  nurseName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  nurseSummary: {
    alignItems: "flex-end",
  },
  summaryNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  summaryCardPrimary: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  summaryCardAlert: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 12,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryIconPrimary: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryIconAlert: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryTag: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
  },
  summaryTagAlert: {
    fontSize: 11,
    color: "#B91C1C",
    fontWeight: "600",
  },
  summaryBig: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  summarySub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 6,
    color: "#111827",
  },
  filterBtn: {
    width: 40,
    height: 40,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    opacity: 0.7,
  },
  filterTabs: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    padding: 3,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: "#FFFFFF",
  },
  filterTabText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  emptyState: {
    marginTop: 20,
    alignItems: "center",
  },
  emptyIcon: {
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  emptySub: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});
