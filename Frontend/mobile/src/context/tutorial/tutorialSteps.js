export const tutorialSteps = [
  {
    id: 'home_tracking',
    route: 'Home',
    target: 'homeTrackingCard',
    message: 'Chào mừng bạn! Đầu tiên, hãy nhấn vào "Theo dõi" để ghi nhận chỉ số sức khỏe hôm nay.',
  },
  {
    id: 'select_blood_pressure',
    route: 'Tracking',
    target: 'bloodPressureCard',
    message: 'Tại đây hiển thị các nhóm chỉ số. Hãy thử chọn "Huyết áp" để xem cách nhập nhé!',
  },
  {
    id: 'input_blood_pressure',
    route: 'InputMeasurement',
    target: 'bloodPressureInput',
    message: 'Chạm vào ô Tâm thu và Tâm trương để nhập thử kết quả (ví dụ: 120 và 80).',
  },
  {
    id: 'save_measurement',
    route: 'InputMeasurement',
    target: 'saveMeasurementButton',
    message: 'Sau khi nhập xong, hãy nhấn "Lưu bản đo" để lưu lại kết quả này.',
  },
  {
    id: 'home_alert',
    route: 'Home',
    target: 'homeAlertCard',
    message: 'Oops! Chỉ số mô phỏng vừa rồi vượt ngưỡng an toàn nên hệ thống báo đỏ. Bạn hãy chạm thử vào thẻ Cảnh báo này nhé!',
  },
  {
    id: 'home_medication',
    route: 'Home',
    target: 'homeMedicationCard',
    message: 'Tuyệt vời. Thực tế khi có cảnh báo, Bác sĩ sẽ liên hệ bạn. Còn bây giờ, hãy xem lịch uống thuốc bằng cách chạm vào ô Thuốc.',
  },
  {
    id: 'confirm_medication',
    route: 'Medication',
    target: 'confirmMedicationButton',
    message: 'Sau khi đã uống thuốc, đừng quên nhấn "Xác nhận đã uống" để bác sĩ an tâm nhé!',
  },
];
