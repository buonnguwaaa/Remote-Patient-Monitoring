// thresholdHelpers.js
// Giúp đánh giá trạng thái của chỉ số đo so với ngưỡng an toàn.

export function evaluateVitalStatus(value, vitalKey, threshold) {
  if (value == null) return "none";
  if (!threshold) return "normal";

  let min = null, max = null;
  switch (vitalKey) {
    case "systolic": min = threshold.systolicMin; max = threshold.systolicMax; break;
    case "diastolic": min = threshold.diastolicMin; max = threshold.diastolicMax; break;
    case "heartRate": min = threshold.heartRateMin; max = threshold.heartRateMax; break;
    case "temperature": min = threshold.temperatureMin; max = threshold.temperatureMax; break;
    case "glucose": min = threshold.glucoseMin; max = threshold.glucoseMax; break;
    case "spo2": min = threshold.spo2Min; max = null; break; // SpO2 thường chỉ có min
    case "respiratoryRate": min = threshold.respiratoryRateMin; max = threshold.respiratoryRateMax; break;
    default: return "normal";
  }

  if (min != null && value < min) return "low";
  if (max != null && value > max) return "high";
  return "normal";
}

export function isMeasurementAbnormal(measurement, threshold) {
  if (!threshold) return false;
  
  if (measurement.heartRate && evaluateVitalStatus(measurement.heartRate, "heartRate", threshold) !== "normal") return true;
  if (measurement.temperature && evaluateVitalStatus(measurement.temperature, "temperature", threshold) !== "normal") return true;
  if (measurement.glucose && evaluateVitalStatus(measurement.glucose, "glucose", threshold) !== "normal") return true;
  if (measurement.spo2 && evaluateVitalStatus(measurement.spo2, "spo2", threshold) !== "normal") return true;
  if (measurement.respiratoryRate && evaluateVitalStatus(measurement.respiratoryRate, "respiratoryRate", threshold) !== "normal") return true;
  
  if (measurement.bloodPressure) {
    if (measurement.bloodPressure.systolic && evaluateVitalStatus(measurement.bloodPressure.systolic, "systolic", threshold) !== "normal") return true;
    if (measurement.bloodPressure.diastolic && evaluateVitalStatus(measurement.bloodPressure.diastolic, "diastolic", threshold) !== "normal") return true;
  }
  return false;
}
