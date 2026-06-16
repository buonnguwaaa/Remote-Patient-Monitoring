import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  MEASUREMENT_SECTIONS,
  hasMeasurementSectionValue,
} from "../utils/measurementForm";

function TypeTile({ active, isSaved, isDraft, item, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.typeTile, active && styles.typeTileActive]}>
      <View style={styles.typeTileTopRow}>
        <View style={styles.typeTileIconWrapper}>
          <Ionicons name={item.iconName} size={18} color={active ? "#2563EB" : "#6B7280"} />
        </View>
        {isSaved ? (
          <View style={styles.tileSavedBadge}>
            <Text style={styles.tileSavedBadgeText}>Đã lưu</Text>
          </View>
        ) : isDraft ? (
          <View style={styles.tileDraftBadge}>
            <Text style={styles.tileDraftBadgeText}>Đang nhập</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.typeTileLabel, active && styles.typeTileLabelActive]} numberOfLines={1}>
        {item.label}
      </Text>
      <Text style={styles.typeTileDesc} numberOfLines={1}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );
}

export default function MeasurementDraftForm({
  type,
  timing,
  values,
  savedSections,
  submitting,
  onSelectType,
  onFieldChange,
  onTimingChange,
  onSaveSection,
  onSubmit,
}) {
  const savedCount = MEASUREMENT_SECTIONS.filter((item) => savedSections[item.key]).length;
  const savedLabels = MEASUREMENT_SECTIONS.filter((item) => savedSections[item.key]).map(
    (item) => item.label
  );
  const allSectionsSaved = savedCount === MEASUREMENT_SECTIONS.length;

  const renderTypeFields = () => {
    if (type === "bp") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Chỉ số huyết áp</Text>
          <View style={styles.row}>
            <View style={styles.fieldColumn}>
              <Text style={styles.fieldLabel}>Tâm thu (SYS)</Text>
              <TextInput
                style={styles.input}
                value={values.systolic}
                onChangeText={(value) => onFieldChange("systolic", value, "bp")}
                keyboardType="numeric"
                placeholder="vd: 120"
              />
              <Text style={styles.fieldHint}>mmHg · 70-250</Text>
            </View>
            <View style={styles.fieldColumn}>
              <Text style={styles.fieldLabel}>Tâm trương (DIA)</Text>
              <TextInput
                style={styles.input}
                value={values.diastolic}
                onChangeText={(value) => onFieldChange("diastolic", value, "bp")}
                keyboardType="numeric"
                placeholder="vd: 80"
              />
              <Text style={styles.fieldHint}>mmHg · 40-150</Text>
            </View>
          </View>
          <View style={[styles.fieldColumn, styles.marginTopMedium]}>
            <Text style={styles.fieldLabel}>Mạch (PULSE)</Text>
            <TextInput
              style={styles.input}
              value={values.heartRate}
              onChangeText={(value) => onFieldChange("heartRate", value, "bp")}
              keyboardType="numeric"
              placeholder="vd: 72"
            />
            <Text style={styles.fieldHint}>lần/phút · 30-220</Text>
          </View>
        </>
      );
    }

    if (type === "glucose") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Chỉ số đường huyết</Text>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Đường huyết</Text>
            <TextInput
              style={styles.input}
              value={values.glucose}
              onChangeText={(value) => onFieldChange("glucose", value, "glucose")}
              keyboardType="numeric"
              placeholder="vd: 110"
            />
            <Text style={styles.fieldHint}>mg/dL · 40-600</Text>
          </View>
          <Text style={[styles.fieldLabel, styles.marginTopMedium]}>Thời điểm đo so với bữa ăn</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chipChoice, timing === "pre" && styles.chipChoiceActive]}
              onPress={() => onTimingChange("pre")}
            >
              <Text style={[styles.chipChoiceText, timing === "pre" && styles.chipChoiceTextActive]}>
                Trước ăn (pre)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chipChoice, timing === "post" && styles.chipChoiceActive]}
              onPress={() => onTimingChange("post")}
            >
              <Text style={[styles.chipChoiceText, timing === "post" && styles.chipChoiceTextActive]}>
                Sau ăn (post)
              </Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    if (type === "spo2") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Chỉ số SpO2</Text>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>SpO2</Text>
            <TextInput
              style={styles.input}
              value={values.spo2}
              onChangeText={(value) => onFieldChange("spo2", value, "spo2")}
              keyboardType="numeric"
              placeholder="vd: 98"
            />
            <Text style={styles.fieldHint}>% · 50-100</Text>
          </View>
        </>
      );
    }

    if (type === "temp") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Nhiệt độ cơ thể</Text>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Nhiệt độ</Text>
            <TextInput
              style={styles.input}
              value={values.temperature}
              onChangeText={(value) => onFieldChange("temperature", value, "temp")}
              keyboardType="numeric"
              placeholder="vd: 36.8"
            />
            <Text style={styles.fieldHint}>°C · 30-45</Text>
          </View>
        </>
      );
    }

    if (type === "heartRate") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Nhịp tim</Text>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Nhịp tim</Text>
            <TextInput
              style={styles.input}
              value={values.heartRate}
              onChangeText={(value) => onFieldChange("heartRate", value, "heartRate")}
              keyboardType="numeric"
              placeholder="vd: 78"
            />
            <Text style={styles.fieldHint}>lần/phút · 30-220</Text>
          </View>
        </>
      );
    }

    return (
      <>
        <Text style={styles.fieldGroupTitle}>Nhịp thở</Text>
        <View style={styles.fieldColumn}>
          <Text style={styles.fieldLabel}>Nhịp thở</Text>
          <TextInput
            style={styles.input}
            value={values.respiratoryRate}
            onChangeText={(value) => onFieldChange("respiratoryRate", value, "respiratoryRate")}
            keyboardType="numeric"
            placeholder="vd: 18"
          />
          <Text style={styles.fieldHint}>lần/phút · 5-60</Text>
        </View>
      </>
    );
  };

  return (
    <>
      <Text style={styles.sectionTitle}>Loại chỉ số cần nhập</Text>
      <View style={styles.card}>
        <Text style={styles.helperText}>
          Chọn nhóm chỉ số cần nhập. Hoàn tất nhóm nào thì bấm "Lưu thông tin". Chỉ cần
          lưu ít nhất 1 nhóm là có thể gửi — nhập càng nhiều nhóm càng tốt.
        </Text>
        <View style={styles.typeGridRow}>
          {MEASUREMENT_SECTIONS.slice(0, 3).map((item) => (
            <TypeTile
              key={item.key}
              active={type === item.key}
              isSaved={savedSections[item.key]}
              isDraft={hasMeasurementSectionValue(item.key, values) && !savedSections[item.key]}
              item={item}
              onPress={() => onSelectType(item.key)}
            />
          ))}
        </View>
        <View style={styles.typeGridRow}>
          {MEASUREMENT_SECTIONS.slice(3, 6).map((item) => (
            <TypeTile
              key={item.key}
              active={type === item.key}
              isSaved={savedSections[item.key]}
              isDraft={hasMeasurementSectionValue(item.key, values) && !savedSections[item.key]}
              item={item}
              onPress={() => onSelectType(item.key)}
            />
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Chi tiết chỉ số đang nhập</Text>
      <View style={styles.card}>
        {renderTypeFields()}
        <TouchableOpacity style={styles.secondaryBtn} onPress={onSaveSection}>
          <Ionicons
            name="document-text-outline"
            size={18}
            color="#2563EB"
            style={styles.secondaryBtnIcon}
          />
          <Text style={styles.secondaryBtnText}>Lưu thông tin</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Thông tin chung của bản đo</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Thiết bị đo</Text>
        <TextInput
          style={styles.input}
          value={values.device}
          onChangeText={(value) => onFieldChange("device", value)}
          placeholder="vd: Omron HEM-7130"
        />
        <Text style={[styles.fieldLabel, styles.marginTopMedium]}>Ghi chú</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={values.note}
          onChangeText={(value) => onFieldChange("note", value)}
          placeholder="Ghi chú thêm nếu có"
          multiline
        />
      </View>

      <Text style={styles.sectionTitle}>Thông tin đã chuẩn bị</Text>
      <View style={styles.card}>
        <Text style={styles.progressTitle}>Đã lưu {savedCount}/6 nhóm chỉ số</Text>
        <Text style={styles.progressSub}>
          Chỉ cần lưu ít nhất 1 nhóm chỉ số là có thể gửi bản đo. Những nhóm chưa nhập sẽ
          được ghi nhận là không có dữ liệu.
        </Text>
        <View style={styles.savedChipWrap}>
          {MEASUREMENT_SECTIONS.map((item) => (
            <View
              key={item.key}
              style={[
                styles.savedChip,
                savedSections[item.key] ? styles.savedChipActive : styles.savedChipInactive,
              ]}
            >
              <Text
                style={[
                  styles.savedChipText,
                  savedSections[item.key]
                    ? styles.savedChipTextActive
                    : styles.savedChipTextInactive,
                ]}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.progressFootnote}>
          {savedLabels.length > 0
            ? `Hiện đã có: ${savedLabels.join(", ")}.`
            : "Hiện chưa có nhóm chỉ số nào được lưu."}
        </Text>
        {!allSectionsSaved ? (
          <Text style={styles.progressFootnote}>
            {savedCount === 0
              ? "Hãy nhập và lưu ít nhất một nhóm chỉ số để có thể gửi."
              : `Đã sẵn sàng gửi với ${savedCount} nhóm chỉ số. Bạn có thể nhập thêm hoặc gửi ngay.`}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        disabled={submitting}
        style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
        onPress={onSubmit}
      >
        <Ionicons name="send-outline" size={18} color="#FFFFFF" style={styles.saveIcon} />
        <Text style={styles.saveText}>{submitting ? "Đang gửi..." : "Gửi bản đo"}</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: 4, marginBottom: 8, color: "#111827" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  helperText: { fontSize: 12, lineHeight: 18, color: "#6B7280", marginBottom: 12 },
  typeGridRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  typeTile: {
    width: "32%",
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  typeTileActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  typeTileTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  typeTileIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  tileSavedBadge: { borderRadius: 999, backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2 },
  tileSavedBadgeText: { fontSize: 10, fontWeight: "700", color: "#15803D" },
  tileDraftBadge: { borderRadius: 999, backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2 },
  tileDraftBadgeText: { fontSize: 10, fontWeight: "700", color: "#B45309" },
  typeTileLabel: { fontSize: 12, fontWeight: "600", color: "#111827" },
  typeTileLabelActive: { color: "#2563EB" },
  typeTileDesc: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  fieldGroupTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 },
  fieldLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  fieldHint: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  fieldColumn: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  textArea: { minHeight: 72, textAlignVertical: "top" },
  marginTopMedium: { marginTop: 12 },
  chipRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  chipChoice: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  chipChoiceActive: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  chipChoiceText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  chipChoiceTextActive: { color: "#2563EB", fontWeight: "600" },
  secondaryBtn: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnIcon: { marginRight: 6 },
  secondaryBtnText: { color: "#2563EB", fontWeight: "700", fontSize: 14 },
  progressTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  progressSub: { marginTop: 6, fontSize: 12, lineHeight: 18, color: "#6B7280" },
  savedChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  savedChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  savedChipActive: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  savedChipInactive: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" },
  savedChipText: { fontSize: 12, fontWeight: "600" },
  savedChipTextActive: { color: "#15803D" },
  savedChipTextInactive: { color: "#6B7280" },
  progressFootnote: { marginTop: 12, fontSize: 12, color: "#374151" },
  progressWarning: { marginTop: 10, fontSize: 12, color: "#B45309", fontWeight: "600" },
  saveBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveIcon: { marginRight: 6 },
  saveText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
