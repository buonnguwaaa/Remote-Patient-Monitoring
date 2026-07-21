export const ROUTE_OPTIONS = [
  "Đường uống",
  "Uống",
  "Tiêm tĩnh mạch",
  "Tiêm bắp",
  "Tiêm dưới da",
  "Bôi ngoài da",
  "Nhỏ mắt",
  "Nhỏ tai",
  "Nhỏ mũi",
  "Đặt dưới lưỡi",
  "Hít (Xịt/Khí dung)",
  "Đặt trực tràng",
  "Đặt âm đạo",
];

export const DRUG_SUGGESTIONS = [
  // Giảm đau, hạ sốt, chống viêm
  {
    name: "Paracetamol",
    dosage: "500mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "noon", customTime: "12:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Ibuprofen",
    dosage: "400mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "noon", customTime: "12:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Diclofenac",
    dosage: "50mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Meloxicam",
    dosage: "7.5mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },

  // Kháng sinh
  {
    name: "Amoxicillin",
    dosage: "500mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "noon", customTime: "14:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Azithromycin",
    dosage: "250mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 2 },
    ],
  },
  {
    name: "Cefuroxime",
    dosage: "500mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Augmentin",
    dosage: "625mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },

  // Dạ dày, Tiêu hóa
  {
    name: "Omeprazole",
    dosage: "20mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "07:00", mealTiming: "pre_meal", pillCount: 1 },
    ],
  },
  {
    name: "Pantoprazole",
    dosage: "40mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "07:00", mealTiming: "pre_meal", pillCount: 1 },
    ],
  },
  {
    name: "Esomeprazole",
    dosage: "40mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "07:00", mealTiming: "pre_meal", pillCount: 1 },
    ],
  },
  {
    name: "Domperidone",
    dosage: "10mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "07:30", mealTiming: "pre_meal", pillCount: 1 },
      { timeOfDay: "evening", customTime: "19:30", mealTiming: "pre_meal", pillCount: 1 },
    ],
  },
  {
    name: "Smecta",
    dosage: "1 gói",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "09:00", mealTiming: "", pillCount: 1 },
      { timeOfDay: "noon", customTime: "15:00", mealTiming: "", pillCount: 1 },
      { timeOfDay: "evening", customTime: "21:00", mealTiming: "", pillCount: 1 },
    ],
  },

  // Tim mạch, Huyết áp
  {
    name: "Amlodipine",
    dosage: "5mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Losartan",
    dosage: "50mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Bisoprolol",
    dosage: "5mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Atorvastatin",
    dosage: "20mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Rosuvastatin",
    dosage: "10mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Aspirin",
    dosage: "81mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },

  // Tiểu đường
  {
    name: "Metformin",
    dosage: "500mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Glimepiride",
    dosage: "2mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "07:30", mealTiming: "pre_meal", pillCount: 1 },
    ],
  },
  {
    name: "Gliclazide",
    dosage: "30mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "07:30", mealTiming: "pre_meal", pillCount: 1 },
    ],
  },

  // Hô hấp, Dị ứng
  {
    name: "Loratadine",
    dosage: "10mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "", pillCount: 1 },
    ],
  },
  {
    name: "Cetirizine",
    dosage: "10mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "", pillCount: 1 },
    ],
  },
  {
    name: "Salbutamol",
    dosage: "2mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "", pillCount: 1 },
      { timeOfDay: "noon", customTime: "14:00", mealTiming: "", pillCount: 1 },
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "", pillCount: 1 },
    ],
  },
  {
    name: "Acetylcysteine",
    dosage: "200mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },

  // Vitamin, Thực phẩm chức năng
  {
    name: "Vitamin C",
    dosage: "500mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Vitamin B Complex",
    dosage: "1 viên",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Calcium + Vitamin D3",
    dosage: "500mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
  {
    name: "Sắt (Ferrous Sulfate)",
    dosage: "200mg",
    route: "Đường uống",
    schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
    ],
  },
];
