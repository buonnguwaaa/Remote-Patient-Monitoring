import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { useAuth } from "../../hooks/useAuth";
import { useNursePatientListData } from "../../hooks/useNursePatientListData";
import NursePatientCard from "../../components/NursePatientCard";
import { NursePatientListHeader } from "../../components/nurse/patientList/NursePatientListHeader";
import { NursePatientListFilter } from "../../components/nurse/patientList/NursePatientListFilter";

export default function NursePatientListScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const {
    patients,
    loading,
    refreshing,
    loadError,
    loadNotice,
    loadPatients,
  } = useNursePatientListData();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const refresh = useCallback(() => {
    loadPatients({ showRefresh: true });
  }, [loadPatients]);

  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [loadPatients])
  );

  const handlePatientPress = useCallback(
    (item) => {
      navigation.navigate("NursePatientDetail", {
        patientId: item.patientId,
        patientSummary: item,
      });
    },
    [navigation]
  );

  // Sorting and filtering logic
  const sortedAndFilteredPatients = useMemo(() => {
    let list = patients || [];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        const nameMatch = p.user?.name?.toLowerCase().includes(q);
        const codeMatch = p.patientCode?.toLowerCase().includes(q);
        return nameMatch || codeMatch;
      });
    }

    // Filter by tabs
    if (filter === "alerts") {
      list = list.filter((p) => {
        const high = p.alertsSummary?.high || 0;
        const medium = p.alertsSummary?.medium || 0;
        const low = p.alertsSummary?.low || 0;
        return high + medium + low > 0;
      });
    } else if (filter === "stable") {
      list = list.filter((p) => {
        const high = p.alertsSummary?.high || 0;
        const medium = p.alertsSummary?.medium || 0;
        const low = p.alertsSummary?.low || 0;
        return high + medium + low === 0;
      });
    }

    // Sort by priority
    list.sort((a, b) => {
      const aHigh = a.alertsSummary?.high || 0;
      const bHigh = b.alertsSummary?.high || 0;
      if (aHigh !== bHigh) return bHigh - aHigh;

      const aOther = (a.alertsSummary?.medium || 0) + (a.alertsSummary?.low || 0);
      const bOther = (b.alertsSummary?.medium || 0) + (b.alertsSummary?.low || 0);
      if (aOther !== bOther) return bOther - aOther;

      const aTime = a.lastMeasurements?.updatedAt ? new Date(a.lastMeasurements.updatedAt).getTime() : 0;
      const bTime = b.lastMeasurements?.updatedAt ? new Date(b.lastMeasurements.updatedAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;

      const aName = a.user?.name || "";
      const bName = b.user?.name || "";
      return aName.localeCompare(bName);
    });

    return list;
  }, [patients, search, filter]);

  const patientsWithAlertsCount = useMemo(() => {
    return (patients || []).filter((p) => {
      return (p.alertsSummary?.high || 0) + (p.alertsSummary?.medium || 0) + (p.alertsSummary?.low || 0) > 0;
    }).length;
  }, [patients]);

  const renderItem = useCallback(
    ({ item }) => (
      <View style={{ paddingHorizontal: 16 }}>
        <NursePatientCard patient={item} onPress={() => handlePatientPress(item)} />
      </View>
    ),
    [handlePatientPress]
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Không có dữ liệu</Text>
        <Text style={styles.emptyDesc}>
          {search ? "Không tìm thấy bệnh nhân nào phù hợp." : "Chưa có bệnh nhân nào được phân công."}
        </Text>
      </View>
    );
  }, [loading, search]);

  const renderListHeader = useCallback(() => (
    <View style={{ paddingBottom: 8 }}>
      <NursePatientListHeader 
        nurseName={user?.name}
        totalPatients={patients?.length || 0}
        patientsWithAlerts={patientsWithAlertsCount}
        search={search}
        setSearch={setSearch}
      />
      {loadError ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={16} color="#B91C1C" />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}
      {loadNotice ? (
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle" size={16} color="#B45309" />
          <Text style={styles.noticeText}>{loadNotice}</Text>
        </View>
      ) : null}
      <NursePatientListFilter filter={filter} setFilter={setFilter} />
    </View>
  ), [user, patients, patientsWithAlertsCount, search, filter, loadError, loadNotice]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={sortedAndFilteredPatients}
        keyExtractor={(item) => item.patientId}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      />
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  listContent: { paddingBottom: 40 },
  emptyContainer: { alignItems: "center", justifyContent: "center", padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#4B5563", marginTop: 12 },
  emptyDesc: { fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 4 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.7)", justifyContent: "center", alignItems: "center" },
  
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEE2E2", marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 8, gap: 8 },
  errorText: { color: "#B91C1C", fontSize: 13, flex: 1 },
  noticeBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF3C7", marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 8, gap: 8 },
  noticeText: { color: "#B45309", fontSize: 13, flex: 1 },
});
