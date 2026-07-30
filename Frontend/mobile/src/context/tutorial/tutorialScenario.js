export const tutorialScenario = {
  measurement: {
    systolic: '180',
    diastolic: '110',
    heartRate: '95',
  },
  medication: {
    name: 'Thuốc huyết áp theo đơn',
    dosage: '5 mg — 1 viên',
    schedule: '08:00 — Sau ăn',
  },
  alert: {
    id: 'tutorial-alert-1',
    title: 'Huyết áp',
    observedText: '180/110 mmHg',
    severityText: 'Ưu tiên cao',
    isHigh: true,
    isAcknowledged: false,
    statusText: 'Đang chờ xử lý',
    createdAt: new Date().toISOString(),
    iconName: 'fitness-outline',
    additionalSummary: 'Chỉ số Huyết áp vượt ngưỡng an toàn.',
  }
};
