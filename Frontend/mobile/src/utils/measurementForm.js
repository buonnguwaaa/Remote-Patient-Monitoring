export const MEASUREMENT_SECTIONS = [
  { key: "bp", iconName: "heart-outline", label: "Huyết áp", description: "SYS / DIA / Mạch" },
  { key: "glucose", iconName: "water-outline", label: "Đường huyết", description: "mg/dL" },
  { key: "spo2", iconName: "pulse-outline", label: "SpO2", description: "% bão hòa O2" },
  { key: "temp", iconName: "thermometer-outline", label: "Nhiệt độ", description: "°C" },
  { key: "heartRate", iconName: "fitness-outline", label: "Nhịp tim", description: "lần/phút" },
  { key: "respiratoryRate", iconName: "cloud-outline", label: "Nhịp thở", description: "lần/phút" },
  { key: "bodyStats", iconName: "body-outline", label: "Thể trạng", description: "Chiều cao / Cân nặng" },
];

export function createSavedMeasurementState() {
  return MEASUREMENT_SECTIONS.reduce((acc, section) => {
    acc[section.key] = false;
    return acc;
  }, {});
}

export function hasMeasurementValue(value) {
  return String(value ?? "").trim().length > 0;
}

export function hasMeasurementSectionValue(sectionKey, values = {}) {
  if (sectionKey === "bp") {
    return (
      hasMeasurementValue(values.systolic) ||
      hasMeasurementValue(values.diastolic) ||
      hasMeasurementValue(values.heartRate)
    );
  }
  if (sectionKey === "glucose") return hasMeasurementValue(values.glucose);
  if (sectionKey === "spo2") return hasMeasurementValue(values.spo2);
  if (sectionKey === "temp") return hasMeasurementValue(values.temperature);
  if (sectionKey === "heartRate") {
    return (
      hasMeasurementValue(values.heartRate) &&
      !hasMeasurementValue(values.systolic) &&
      !hasMeasurementValue(values.diastolic)
    );
  }
  if (sectionKey === "respiratoryRate") {
    return hasMeasurementValue(values.respiratoryRate);
  }
  if (sectionKey === "bodyStats") {
    return hasMeasurementValue(values.height) || hasMeasurementValue(values.weight);
  }
  return false;
}

function toOptionalNumber(value, emptyNumberValue) {
  return hasMeasurementValue(value) ? Number(value) : emptyNumberValue;
}

function toOptionalText(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

export function buildMeasurementPayload({
  patientId,
  values = {},
  emptyNumberValue = 0,
}) {
  const hasBp =
    Number(values.systolic) > 0 ||
    Number(values.diastolic) > 0 ||
    Number(values.heartRate) > 0;
  const hasGlucose = hasMeasurementValue(values.glucose);

  return {
    patientId,
    temperature: toOptionalNumber(values.temperature, emptyNumberValue),
    heartRate: toOptionalNumber(values.heartRate, emptyNumberValue),
    respiratoryRate: toOptionalNumber(values.respiratoryRate, emptyNumberValue),
    spo2: toOptionalNumber(values.spo2, emptyNumberValue),
    height: toOptionalNumber(values.height, emptyNumberValue),
    weight: toOptionalNumber(values.weight, emptyNumberValue),
    bloodPressure: {
      systolic: toOptionalNumber(values.systolic, emptyNumberValue),
      diastolic: toOptionalNumber(values.diastolic, emptyNumberValue),
    },
    glucose: hasGlucose ? { bloodGlucose: Number(values.glucose) } : null,
    mealTiming: hasGlucose ? values.mealTiming : null,
    device: toOptionalText(values.device),
    note: toOptionalText(values.note),
  };
}

export function hasAtLeastOneSavedSection(savedSections) {
  return MEASUREMENT_SECTIONS.some((item) => savedSections[item.key]);
}

export function getMeasurementValidationError(sectionKey, values = {}) {
  if (sectionKey === "bp") {
    const sys = Number(values.systolic);
    const dia = Number(values.diastolic);
    const pulse = Number(values.heartRate);

    if (!values.systolic || !values.diastolic || !values.heartRate) {
      return {
        title: "Thiếu chỉ số",
        message: "Huyết áp yêu cầu đủ: Tâm thu, Tâm trương và mạch.",
      };
    }

    if (
      Number.isNaN(sys) ||
      Number.isNaN(dia) ||
      Number.isNaN(pulse) ||
      sys < 70 ||
      sys > 250 ||
      dia < 40 ||
      dia > 150 ||
      pulse < 30 ||
      pulse > 220
    ) {
      return {
        title: "Giá trị không hợp lệ",
        message: "Hãy kiểm tra lại khoảng giá trị hợp lý cho huyết áp.",
      };
    }
  }

  if (sectionKey === "glucose") {
    const value = Number(values.glucose);
    if (!values.glucose) {
      return {
        title: "Thiếu chỉ số",
        message: "Hãy nhập giá trị đường huyết.",
      };
    }

    if (Number.isNaN(value) || value < 40 || value > 600) {
      return {
        title: "Giá trị không hợp lệ",
        message: "Đường huyết nên nằm trong khoảng 40-600 mg/dL.",
      };
    }

    if (!values.mealTiming) {
      return {
        title: "Thiếu thời điểm đo",
        message: "Hãy chọn thời điểm đo đường huyết (Trước ăn hoặc Sau ăn).",
      };
    }
  }

  if (sectionKey === "spo2") {
    const value = Number(values.spo2);
    if (!values.spo2) {
      return {
        title: "Thiếu chỉ số",
        message: "Hãy nhập giá trị SpO2.",
      };
    }

    if (Number.isNaN(value) || value < 50 || value > 100) {
      return {
        title: "Giá trị không hợp lệ",
        message: "SpO2 thông thường nằm trong khoảng 50-100%.",
      };
    }
  }

  if (sectionKey === "temp") {
    const value = Number(values.temperature);
    if (!values.temperature) {
      return {
        title: "Thiếu chỉ số",
        message: "Hãy nhập giá trị nhiệt độ cơ thể.",
      };
    }

    if (Number.isNaN(value) || value < 30 || value > 45) {
      return {
        title: "Giá trị không hợp lệ",
        message: "Nhiệt độ cơ thể nên nằm trong khoảng 30-45°C.",
      };
    }
  }

  if (sectionKey === "heartRate") {
    const value = Number(values.heartRate);
    if (!values.heartRate) {
      return {
        title: "Thiếu chỉ số",
        message: "Hãy nhập giá trị nhịp tim.",
      };
    }

    if (Number.isNaN(value) || value < 30 || value > 220) {
      return {
        title: "Giá trị không hợp lệ",
        message: "Nhịp tim nên nằm trong khoảng 30-220 lần/phút.",
      };
    }
  }

  if (sectionKey === "respiratoryRate") {
    const value = Number(values.respiratoryRate);
    if (!values.respiratoryRate) {
      return {
        title: "Thiếu chỉ số",
        message: "Hãy nhập giá trị nhịp thở.",
      };
    }

    if (Number.isNaN(value) || value < 5 || value > 60) {
      return {
        title: "Giá trị không hợp lệ",
        message: "Nhịp thở nên nằm trong khoảng 5-60 lần/phút.",
      };
    }
  }

  if (sectionKey === "bodyStats") {
    const h = Number(values.height);
    const w = Number(values.weight);
    
    if (!values.height && !values.weight) {
      return {
        title: "Thiếu chỉ số",
        message: "Hãy nhập chiều cao hoặc cân nặng.",
      };
    }
    
    if (values.height && (Number.isNaN(h) || h < 30 || h > 300)) {
      return {
        title: "Giá trị không hợp lệ",
        message: "Chiều cao nên nằm trong khoảng 30-300 cm.",
      };
    }
    
    if (values.weight && (Number.isNaN(w) || w < 2 || w > 500)) {
      return {
        title: "Giá trị không hợp lệ",
        message: "Cân nặng nên nằm trong khoảng 2-500 kg.",
      };
    }
  }

  return null;
}

export function getMeasurementSectionLabel(sectionKey) {
  return (
    MEASUREMENT_SECTIONS.find((item) => item.key === sectionKey)?.label ||
    "Thông tin"
  );
}
