import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Linking, RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import useNursePatientDetailData from "../../hooks/useNursePatientDetailData";

// Components
import { PatientHeroHeader } from "../../components/nurse/patientDetail/PatientHeroHeader";
import { PatientQuickActions } from "../../components/nurse/patientDetail/PatientQuickActions";
import { PatientTabs, TABS } from "../../components/nurse/patientDetail/PatientTabs";
import { LatestVitalsGrid } from "../../components/nurse/patientDetail/LatestVitalsGrid";
import { MeasurementTimeline } from "../../components/nurse/patientDetail/MeasurementTimeline";
import { AlertSummaryCard } from "../../components/nurse/patientDetail/AlertSummaryCard";
import { PrescriptionShortList } from "../../components/nurse/patientDetail/PrescriptionShortList";
import { ThresholdOverview } from "../../components/nurse/patientDetail/ThresholdOverview";
import { PatientProfileSection } from "../../components/nurse/patientDetail/PatientProfileSection";

export default function PatientDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const { patientId, patientSummary } = route.params || {};

  const { 
    profile, measurements, latestThreshold, alerts, prescriptions, 
    loading, refreshing, load, refresh 
  } = useNursePatientDetailData(patientId);

  const [activeTab, setActiveTab] = useState(TABS[0].key);

  useEffect(() => {
    if (patientId) load();
  }, [patientId, load]);

  const displayProfile = profile || {
    name: patientSummary?.user?.name || "Bệnh nhân",
    patientCode: patientSummary?.patientCode || "",
    isActive: patientSummary?.user?.isActive !== false,
  };

  const openAlertCount = alerts.filter(a => a.status === "open").length;

  const handleInputMeasurement = useCallback(() => {
    navigation.navigate("NurseMainTabs", {
      screen: "NurseMeasurementInput",
      params: {
        preselectedPatient: {
          patientId,
          patientCode: displayProfile.patientCode,
          name: displayProfile.name,
          assignmentId: patientSummary?.assignmentId || "",
        },
      }
    });
  }, [navigation, patientId, displayProfile, patientSummary]);

  const handleCall = useCallback((phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handlePrescriptionNav = useCallback(() => {
    navigation.navigate("NurseMainTabs", { 
      screen: "NursePrescriptions", 
      params: { patientId } 
    });
  }, [navigation, patientId]);

  if (loading && !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  const latestMeasurement = measurements?.[0] || null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <PatientHeroHeader 
        profile={displayProfile} 
        openAlertCount={openAlertCount}
        onBack={() => navigation.goBack()}
      />
      
      <PatientQuickActions 
        phone={displayProfile.phone}
        emergencyPhone={displayProfile.emergencyContactPhone}
        onInput={handleInputMeasurement}
        onPrescription={handlePrescriptionNav}
        onCall={handleCall}
      />

      <PatientTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {activeTab === "history" && (
          <View>
            {latestMeasurement && (
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginHorizontal: 16, marginTop: 16, marginBottom: -8 }}>
                Kết quả đo gần nhất
              </Text>
            )}
            <LatestVitalsGrid measurement={latestMeasurement} threshold={latestThreshold} />
            <View style={{ height: 1, backgroundColor: "#E5E7EB", marginHorizontal: 16, marginVertical: 8 }} />
            <MeasurementTimeline measurements={measurements} threshold={latestThreshold} />
          </View>
        )}

        {activeTab === "alerts" && (
          <AlertSummaryCard alerts={alerts} />
        )}

        {activeTab === "prescriptions" && (
          <PrescriptionShortList prescriptions={prescriptions} onNavigate={handlePrescriptionNav} />
        )}

        {activeTab === "profile" && (
          <PatientProfileSection profile={displayProfile} />
        )}

        {activeTab === "thresholds" && (
          <ThresholdOverview threshold={latestThreshold} />
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { flex: 1 },
});
