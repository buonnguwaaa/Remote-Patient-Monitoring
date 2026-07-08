import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function PrescriptionStatsHeader({ stats }) {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.mainCard}>
        <View style={styles.row}>
          <View style={styles.miniStat}>
            <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="receipt" size={16} color="#2563EB" />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.statNum, { color: '#1D4ED8' }]}>{stats.total || 0}</Text>
              <Text style={styles.statLabel}>Tổng đơn</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.miniStat}>
            <View style={[styles.iconWrap, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="pulse" size={16} color="#16A34A" />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.statNum, { color: '#15803D' }]}>{stats.active || 0}</Text>
              <Text style={styles.statLabel}>Đang dùng</Text>
            </View>
          </View>
        </View>

        <View style={styles.hDivider} />

        <View style={styles.row}>
          <View style={styles.miniStat}>
            <View style={[styles.iconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="warning" size={16} color="#EA580C" />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.statNum, { color: '#C2410C' }]}>{stats.expiring || 0}</Text>
              <Text style={styles.statLabel}>Sắp hết</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.miniStat}>
            <View style={[styles.iconWrap, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="stop-circle" size={16} color="#4B5563" />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.statNum, { color: '#374151' }]}>{stats.stopped || 0}</Text>
              <Text style={styles.statLabel}>Đã dừng</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    marginBottom: 16,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  statNum: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  hDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
});
