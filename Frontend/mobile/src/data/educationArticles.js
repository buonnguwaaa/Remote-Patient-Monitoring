export const DISEASE_TYPES = {
  BLOOD_PRESSURE: 'bloodPressure',
  GLUCOSE: 'glucose',
  GENERAL: 'general',
  LIFESTYLE: 'lifestyle',
  MEDICATION: 'medication',
};

export const BADGE_CONFIG = {
  bloodPressure: {
    label: 'Huyết áp',
    bg: '#FDE8E8',
    color: '#C0392B',
    gradientStart: '#FF6B6B',
    gradientEnd: '#EE5A24',
    emoji: '❤️',
    darkColor: '#991B1B',
  },
  glucose: {
    label: 'Tiểu đường',
    bg: '#E8EAF6',
    color: '#3949AB',
    gradientStart: '#667EEA',
    gradientEnd: '#764BA2',
    emoji: '🩸',
    darkColor: '#1E3A8A',
  },
  general: {
    label: 'Sinh hiệu',
    bg: '#E8F5E9',
    color: '#2E7D32',
    gradientStart: '#11998E',
    gradientEnd: '#38EF7D',
    emoji: '💚',
    darkColor: '#14532D',
  },
  lifestyle: {
    label: 'Lối sống',
    bg: '#FFF3E0',
    color: '#E65100',
    gradientStart: '#F7971E',
    gradientEnd: '#FFD200',
    emoji: '🌟',
    darkColor: '#92400E',
  },
  medication: {
    label: 'Thuốc',
    bg: '#F3E5F5',
    color: '#7B1FA2',
    gradientStart: '#A855F7',
    gradientEnd: '#EC4899',
    emoji: '💊',
    darkColor: '#581C87',
  },
};

// Dữ liệu bài học giáo dục sức khỏe tĩnh — không kết nối backend
// Nội dung chỉ mang tính tham khảo, không thay thế tư vấn của bác sĩ.

export const educationArticles = [
  // ===== NHÓM A — TĂNG HUYẾT ÁP =====
  {
    id: 'bp_measure_correctly',
    diseaseType: 'bloodPressure',
    emoji: '🩺',
    title: 'Cách đo huyết áp đúng tại nhà',
    summary: 'Các bước giúp kết quả đo huyết áp tại nhà chính xác và đáng tin cậy hơn.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['huyết áp', 'theo dõi tại nhà'],
    content: [
      {
        type: 'paragraph',
        text: 'Đo huyết áp tại nhà giúp bác sĩ có thêm dữ liệu để theo dõi sức khỏe của bạn. Tuy nhiên, kết quả chỉ có giá trị khi bạn thực hiện đúng cách.',
      },
      {
        type: 'bullet',
        title: 'Chuẩn bị trước khi đo:',
        items: [
          'Nghỉ ngơi ít nhất 5 phút trước khi đo, tránh vận động mạnh.',
          'Không uống cà phê, trà đặc hoặc hút thuốc trong vòng 30 phút trước đo.',
          'Đi vệ sinh trước nếu cần — bàng quang đầy có thể làm tăng kết quả.',
          'Ngồi thư giãn, không nói chuyện trong lúc đo.',
        ],
      },
      {
        type: 'bullet',
        title: 'Tư thế đo đúng:',
        items: [
          'Ngồi thẳng lưng trên ghế, hai chân đặt phẳng trên sàn.',
          'Đặt cánh tay lên bàn ngang tầm tim — không giơ tay quá cao hay để thõng xuống.',
          'Đặt vòng bít cách khuỷu tay khoảng 2–3 cm (khoảng 2 ngón tay).',
          'Vòng bít phải vừa khít — nếu quá lỏng hoặc quá chặt sẽ cho kết quả sai.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Nên đo cùng một thời điểm trong ngày (ví dụ: buổi sáng sau khi thức dậy và buổi tối trước khi ngủ) để kết quả dễ so sánh theo thời gian.',
      },
      {
        type: 'note',
        text: 'Ghi lại kết quả vào app ngay sau khi đo để bác sĩ có thể theo dõi xu hướng huyết áp của bạn.',
      },
      {
        type: 'paragraph',
        text: 'Ngoài ra, kích thước vòng bít (cuff) cũng rất quan trọng. Vòng bít quá nhỏ so với bắp tay sẽ làm kết quả đo cao hơn thực tế, và ngược lại. Hãy chọn loại có kích cỡ phù hợp với chu vi bắp tay của bạn.',
      },
    ],
    quiz: [
      {
        question: 'Bạn nên nghỉ ngơi bao lâu trước khi đo huyết áp?',
        options: ['Không cần nghỉ', 'Ít nhất 5 phút', 'Ít nhất 30 phút', 'Ít nhất 1 tiếng'],
        correctIndex: 1,
        explanation: 'Nghỉ ngơi ít nhất 5 phút trước khi đo giúp cơ thể ổn định và cho kết quả chính xác hơn.',
      },
      {
        question: 'Vòng bít nên được đặt cách khuỷu tay khoảng bao nhiêu?',
        options: ['Ngay sát khuỷu tay', '2–3 cm', '5–6 cm', '10 cm'],
        correctIndex: 1,
        explanation: 'Đặt vòng bít cách khuỷu tay 2–3 cm (khoảng 2 ngón tay) là đúng chuẩn theo hướng dẫn sử dụng máy đo huyết áp.',
      },
      {
        question: 'Điều nào sau đây KHÔNG nên làm trước khi đo huyết áp?',
        options: ['Ngồi nghỉ ngơi', 'Uống cà phê', 'Đi vệ sinh', 'Thở đều'],
        correctIndex: 1,
        explanation: 'Cà phê chứa caffeine có thể làm tăng huyết áp tạm thời, nên tránh trong 30 phút trước khi đo.',
      },
      {
        question: 'Nếu bạn nói chuyện trong khi máy đang đo, kết quả có thể bị ảnh hưởng như thế nào?',
        options: ['Làm kết quả thấp hơn', 'Làm kết quả cao hơn hoặc gây lỗi máy', 'Không bị ảnh hưởng', 'Làm máy đo nhanh hơn'],
        correctIndex: 1,
        explanation: 'Nói chuyện hoặc cử động có thể làm thay đổi áp lực máu tạm thời, khiến kết quả cao hơn thực tế hoặc gây báo lỗi trên máy.',
      },
      {
        question: 'Vòng bít (băng quấn) quá chật so với bắp tay sẽ gây ra điều gì?',
        options: ['Kết quả đo cao hơn thực tế', 'Kết quả đo thấp hơn thực tế', 'Không ảnh hưởng', 'Kết quả đo chính xác hơn'],
        correctIndex: 0,
        explanation: 'Sử dụng vòng bít quá nhỏ hoặc quấn quá chật sẽ tạo áp lực dư thừa, dẫn đến chỉ số huyết áp hiển thị cao hơn thực tế.',
      },
    ],
  },

  {
    id: 'bp_systolic_diastolic',
    diseaseType: 'bloodPressure',
    emoji: '❤️',
    title: 'Huyết áp tâm thu và tâm trương là gì?',
    summary: 'Hiểu ý nghĩa của hai con số trong kết quả đo huyết áp.',
    estimatedMinutes: 3,
    level: 'basic',
    tags: ['huyết áp', 'chỉ số'],
    content: [
      {
        type: 'paragraph',
        text: 'Kết quả đo huyết áp thường hiển thị dạng hai số, ví dụ: 120/80 mmHg. Hai con số này có ý nghĩa khác nhau và đều quan trọng.',
      },
      {
        type: 'bullet',
        title: 'Số trên — Huyết áp tâm thu (SYS):',
        items: [
          'Là áp lực máu trong động mạch khi tim co bóp để bơm máu đi.',
          'Thường là con số lớn hơn trong kết quả đo.',
          'Ví dụ: Con số "120" trong kết quả 120/80.',
        ],
      },
      {
        type: 'bullet',
        title: 'Số dưới — Huyết áp tâm trương (DIA):',
        items: [
          'Là áp lực máu trong động mạch giữa hai lần tim đập, khi tim đang nghỉ.',
          'Thường là con số nhỏ hơn trong kết quả đo.',
          'Ví dụ: Con số "80" trong kết quả 120/80.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Cả hai chỉ số đều cần được theo dõi. Một trong hai bất thường đều cần được chú ý và báo cáo cho bác sĩ.',
      },
      {
        type: 'note',
        text: 'Đừng kết luận tình trạng sức khỏe chỉ dựa vào một lần đo. Xu hướng nhiều ngày mới có ý nghĩa lâm sàng.',
      },
      {
        type: 'paragraph',
        text: 'Đơn vị đo huyết áp tiêu chuẩn là milimét thủy ngân (viết tắt là mmHg). Một mức huyết áp bình thường ở người trưởng thành khỏe mạnh thường dao động dưới 120/80 mmHg.',
      },
    ],
    quiz: [
      {
        question: 'Huyết áp tâm thu (SYS) đo khi nào?',
        options: ['Khi tim đang nghỉ', 'Khi tim co bóp bơm máu', 'Khi đang ngủ', 'Khi vừa vận động xong'],
        correctIndex: 1,
        explanation: 'Huyết áp tâm thu là áp lực đo được lúc tim co bóp để bơm máu vào động mạch.',
      },
      {
        question: 'Trong kết quả 130/85 mmHg, con số 85 là gì?',
        options: ['Huyết áp tâm thu', 'Huyết áp tâm trương', 'Nhịp tim', 'SpO₂'],
        correctIndex: 1,
        explanation: 'Con số nhỏ hơn (85) là huyết áp tâm trương, đo lúc tim đang nghỉ giữa hai lần đập.',
      },
      {
        question: 'Khi nào nên lo lắng về huyết áp?',
        options: [
          'Chỉ khi một trong hai số bất thường',
          'Chỉ khi cả hai số đều bất thường',
          'Khi cả hai số bất thường nhiều lần liên tiếp',
          'Không cần lo nếu không có triệu chứng',
        ],
        correctIndex: 2,
        explanation: 'Một kết quả đơn lẻ chưa đủ kết luận. Cần theo dõi xu hướng nhiều lần và báo cho bác sĩ khi có bất thường lặp lại.',
      },
      {
        question: 'Đơn vị đo huyết áp là gì?',
        options: ['mg/dL', 'mmHg', 'bpm', 'kg'],
        correctIndex: 1,
        explanation: 'Huyết áp được đo bằng đơn vị milimét thủy ngân, viết tắt là mmHg.',
      },
      {
        question: 'Mức huyết áp nào thường được coi là mục tiêu khỏe mạnh cho người trưởng thành (nếu không có bệnh lý nền)?',
        options: ['Khoảng 140/90 mmHg', 'Dưới 120/80 mmHg', 'Dưới 100/60 mmHg', 'Khoảng 160/100 mmHg'],
        correctIndex: 1,
        explanation: 'Huyết áp tối ưu thường được xác định là dưới 120/80 mmHg, tuy nhiên mục tiêu cụ thể có thể khác nhau tùy tình trạng cá nhân và chỉ định của bác sĩ.',
      },
    ],
  },

  {
    id: 'bp_abnormal_values',
    diseaseType: 'bloodPressure',
    emoji: '⚠️',
    title: 'Khi nào huyết áp được xem là bất thường?',
    summary: 'Hiểu khi nào cần chú ý đến kết quả huyết áp và bước tiếp theo là gì.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['huyết áp', 'ngưỡng', 'cảnh báo'],
    content: [
      {
        type: 'paragraph',
        text: 'App theo dõi sức khỏe của bạn sử dụng ngưỡng huyết áp được bác sĩ cá nhân hóa riêng cho bạn. Khi kết quả vượt ngưỡng đó, hệ thống sẽ tạo cảnh báo để bác sĩ xem xét.',
      },
      {
        type: 'paragraph',
        text: 'Nếu kết quả đo bất thường so với ngưỡng của bạn, không nên hoảng loạn ngay. Hãy làm theo các bước sau:',
      },
      {
        type: 'bullet',
        title: 'Khi gặp kết quả bất thường:',
        items: [
          'Nghỉ ngơi thêm 10–15 phút.',
          'Kiểm tra lại tư thế và vị trí vòng bít.',
          'Đo lại lần hai sau khi nghỉ đủ.',
          'Ghi lại cả hai kết quả vào app.',
          'Nếu kết quả lần hai vẫn bất thường, liên hệ bác sĩ hoặc điều dưỡng phụ trách.',
        ],
      },
      {
        type: 'bullet',
        title: 'Liên hệ y tế ngay nếu có các dấu hiệu sau kèm theo:',
        items: [
          'Đau đầu dữ dội, đột ngột.',
          'Đau ngực, khó thở.',
          'Yếu liệt tay chân hoặc nói khó.',
          'Chóng mặt dữ dội, sắp ngất.',
        ],
      },
      {
        type: 'note',
        text: 'Ngưỡng của bạn có thể khác người khác tùy theo tình trạng sức khỏe. Hãy hỏi bác sĩ về ngưỡng cá nhân hóa của bạn.',
      },
      {
        type: 'paragraph',
        text: 'Tuyệt đối không tự ý uống thêm thuốc hoặc tăng liều hạ áp chỉ vì thấy kết quả đo một lần cao hơn bình thường nếu chưa có hướng dẫn trước đó của bác sĩ, vì việc hạ huyết áp quá nhanh có thể gây sốc hoặc chóng mặt.',
      },
    ],
    quiz: [
      {
        question: 'Nếu kết quả đo bất thường, bước đầu tiên nên làm là gì?',
        options: ['Gọi cấp cứu ngay', 'Nghỉ ngơi và đo lại', 'Uống thêm thuốc', 'Bỏ qua vì có thể sai'],
        correctIndex: 1,
        explanation: 'Hãy nghỉ ngơi thêm 10–15 phút rồi đo lại với tư thế đúng. Nếu vẫn bất thường mới liên hệ bác sĩ.',
      },
      {
        question: 'App theo dõi sức khỏe sử dụng ngưỡng huyết áp nào?',
        options: [
          'Một ngưỡng giống nhau cho tất cả mọi người',
          'Ngưỡng do bác sĩ cá nhân hóa riêng cho từng bệnh nhân',
          'Ngưỡng tự bệnh nhân nhập vào',
          'Không có ngưỡng nào',
        ],
        correctIndex: 1,
        explanation: 'Ngưỡng trong app được bác sĩ thiết lập riêng phù hợp với tình trạng của từng bệnh nhân.',
      },
      {
        question: 'Triệu chứng nào cần liên hệ y tế NGAY LẬP TỨC?',
        options: [
          'Đau đầu nhẹ thoáng qua',
          'Hơi chóng mặt sau khi đứng dậy',
          'Đau ngực kèm khó thở',
          'Kết quả huyết áp cao hơn bình thường 5 mmHg',
        ],
        correctIndex: 2,
        explanation: 'Đau ngực kèm khó thở là dấu hiệu nghiêm trọng cần hỗ trợ y tế khẩn cấp, không chần chừ.',
      },
      {
        question: 'Nếu kết quả đo lần đầu bất thường, bạn nên chờ bao lâu để đo lại lần hai?',
        options: ['Đo lại ngay lập tức', 'Khoảng 1-2 phút', '10-15 phút', 'Chờ sang ngày hôm sau'],
        correctIndex: 2,
        explanation: 'Nên ngồi nghỉ ngơi hoàn toàn từ 10-15 phút để cơ thể ổn định trước khi đo lại lần hai để có kết quả chính xác nhất.',
      },
      {
        question: 'Bạn có nên tự uống gấp đôi liều thuốc khi thấy huyết áp đột ngột tăng cao?',
        options: ['Có, để hạ huyết áp ngay', 'Không, tuyệt đối không tự ý đổi liều', 'Có, nếu cảm thấy đau đầu', 'Chỉ uống thêm nửa viên'],
        correctIndex: 1,
        explanation: 'Tự ý thay đổi liều lượng thuốc có thể gây tụt huyết áp quá mức nguy hiểm. Chỉ thực hiện khi có phác đồ hướng dẫn trước của bác sĩ.',
      },
    ],
  },

  {
    id: 'bp_low_salt_diet',
    diseaseType: 'bloodPressure',
    emoji: '🧂',
    title: 'Ăn nhạt cho người tăng huyết áp',
    summary: 'Cách giảm muối trong bữa ăn hằng ngày để hỗ trợ sức khỏe tim mạch.',
    estimatedMinutes: 5,
    level: 'basic',
    tags: ['huyết áp', 'dinh dưỡng', 'muối'],
    content: [
      {
        type: 'paragraph',
        text: 'Ăn mặn có thể làm cơ thể giữ nước nhiều hơn, dẫn đến áp lực lên thành mạch tăng lên. Đây là lý do việc giảm muối thường được khuyến khích cho người theo dõi huyết áp.',
      },
      {
        type: 'bullet',
        title: 'Thực phẩm cần hạn chế trong bữa ăn Việt Nam:',
        items: [
          'Nước mắm, nước tương, tương hoisin, mắm tôm — dùng ít hoặc pha loãng.',
          'Mì gói, cháo gói, súp gói — thường chứa rất nhiều muối.',
          'Thực phẩm đóng hộp: cá hộp, thịt hộp, rau củ muối chua.',
          'Đồ ăn chế biến sẵn: xúc xích, chả lụa, thịt nguội.',
          'Bánh mì, bánh snack mặn.',
        ],
      },
      {
        type: 'bullet',
        title: 'Gợi ý thay thế thực tế:',
        items: [
          'Nêm ít muối khi nấu ăn, thêm rau thơm hoặc chanh để tạo hương vị.',
          'Đọc nhãn thực phẩm: tìm từ "Sodium" hoặc "Na" để biết lượng muối.',
          'Nấu ăn tại nhà giúp kiểm soát lượng muối tốt hơn.',
          'Thay thế nước chấm đậm bằng loại ít muối hoặc pha loãng với nước.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Thay đổi từ từ thay vì đột ngột ăn rất nhạt — điều này giúp vị giác của bạn dần thích nghi và dễ duy trì lâu dài hơn.',
      },
      {
        type: 'note',
        text: 'Mục tiêu là hình thành thói quen ăn ít mặn hơn trước, không nhất thiết phải ăn nhạt hoàn toàn ngay từ đầu.',
      },
      {
        type: 'paragraph',
        text: 'Bạn có thể sử dụng các loại gia vị tự nhiên như tiêu, tỏi, hành, ớt, nước cốt chanh hoặc các loại thảo mộc để tăng thêm hương vị cho món ăn thay vì dùng muối hay bột ngọt (bột ngọt cũng chứa một lượng natri nhất định).',
      },
    ],
    quiz: [
      {
        question: 'Tại sao ăn mặn có thể ảnh hưởng đến huyết áp?',
        options: [
          'Vì muối làm tim đập nhanh hơn',
          'Vì muối khiến cơ thể giữ nước, tăng áp lực lên mạch máu',
          'Vì muối làm giảm oxy trong máu',
          'Vì muối gây căng thẳng thần kinh',
        ],
        correctIndex: 1,
        explanation: 'Natri trong muối khiến cơ thể giữ nước. Lượng nước nhiều hơn trong mạch máu làm tăng áp lực lên thành mạch.',
      },
      {
        question: 'Loại thực phẩm nào THƯỜNG chứa nhiều muối ẩn?',
        options: ['Rau xanh luộc', 'Trái cây tươi', 'Mì gói và thực phẩm đóng hộp', 'Cơm trắng'],
        correctIndex: 2,
        explanation: 'Mì gói, cháo gói và thực phẩm đóng hộp thường chứa rất nhiều muối để bảo quản và tạo hương vị.',
      },
      {
        question: 'Cách nào sau đây giúp kiểm soát lượng muối trong bữa ăn tốt nhất?',
        options: [
          'Dùng thật nhiều nước tương thay nước mắm',
          'Nấu ăn tại nhà và đọc nhãn thực phẩm',
          'Không ăn cơm',
          'Ăn nhanh để không có thời gian nêm nếm',
        ],
        correctIndex: 1,
        explanation: 'Nấu ăn tại nhà giúp bạn kiểm soát lượng muối, và đọc nhãn thực phẩm giúp nhận ra thực phẩm chứa nhiều natri.',
      },
      {
        question: 'Bột ngọt (mì chính) có an toàn tuyệt đối cho người cần ăn nhạt không?',
        options: ['Có, vì nó không mặn', 'Không, vì bột ngọt cũng chứa natri', 'Có, bột ngọt làm giảm huyết áp', 'Chỉ khi nấu canh'],
        correctIndex: 1,
        explanation: 'Thành phần chính của bột ngọt là Monosodium Glutamate, chứa Natri (sodium) có thể góp phần làm tăng huyết áp nếu dùng nhiều.',
      },
      {
        question: 'Cách tốt nhất để làm món ăn đậm đà hơn mà không cần thêm muối là gì?',
        options: ['Thêm đường', 'Thêm mắm tôm', 'Sử dụng tiêu, hành, tỏi, thảo mộc hoặc chanh', 'Sử dụng nước mắm pha loãng với nước tương'],
        correctIndex: 2,
        explanation: 'Các loại gia vị tự nhiên và thảo mộc giúp tăng hương vị kích thích vị giác rất hiệu quả mà không bổ sung thêm natri.',
      },
    ],
  },

  {
    id: 'bp_safe_exercise',
    diseaseType: 'bloodPressure',
    emoji: '🚶',
    title: 'Vận động an toàn cho người tăng huyết áp',
    summary: 'Vận động đúng cách giúp tim mạch khỏe hơn và huyết áp ổn định hơn.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['huyết áp', 'vận động', 'tim mạch'],
    content: [
      {
        type: 'paragraph',
        text: 'Vận động thể chất đều đặn là một trong những cách tự nhiên giúp hỗ trợ sức khỏe tim mạch. Nhiều nghiên cứu cho thấy người vận động thường xuyên có xu hướng duy trì huyết áp ổn định hơn.',
      },
      {
        type: 'bullet',
        title: 'Các hoạt động phù hợp để bắt đầu:',
        items: [
          'Đi bộ nhẹ 20–30 phút mỗi ngày — dễ thực hiện và phù hợp mọi lứa tuổi.',
          'Đạp xe chậm trên đường bằng phẳng.',
          'Tập giãn cơ, yoga nhẹ, hoặc dưỡng sinh.',
          'Bơi lội nhẹ nhàng nếu có điều kiện.',
        ],
      },
      {
        type: 'bullet',
        title: 'Lưu ý an toàn khi vận động:',
        items: [
          'Bắt đầu chậm, tăng dần cường độ — đừng gắng sức đột ngột.',
          'Khởi động nhẹ trước và hạ nhiệt sau buổi tập.',
          'Dừng ngay và nghỉ nếu cảm thấy chóng mặt, đau ngực, khó thở bất thường, hoặc tim đập mạnh.',
          'Hỏi ý kiến bác sĩ trước khi bắt đầu bài tập nặng hơn, đặc biệt nếu có bệnh tim mạch kèm theo.',
        ],
      },
      {
        type: 'note',
        text: 'Mục tiêu là vận động đều đặn, không nhất thiết phải tập nặng. Đi bộ 30 phút mỗi ngày đã là rất tốt.',
      },
      {
        type: 'paragraph',
        text: 'Những người bị tăng huyết áp nên tránh các bài tập nín thở gắng sức (như nâng tạ quá nặng), vì việc nín thở và dùng sức mạnh đột ngột (nghiệm pháp Valsalva) sẽ làm huyết áp tăng vọt tức thời rất nguy hiểm.',
      },
    ],
    quiz: [
      {
        question: 'Hoạt động nào phù hợp nhất để bắt đầu vận động cho người tăng huyết áp?',
        options: [
          'Chạy nhanh 5km ngay từ đầu',
          'Nâng tạ nặng',
          'Đi bộ nhẹ nhàng 20–30 phút mỗi ngày',
          'Tập thể hình cường độ cao',
        ],
        correctIndex: 2,
        explanation: 'Đi bộ nhẹ nhàng là lựa chọn an toàn và bền vững cho người mới bắt đầu vận động với mục tiêu hỗ trợ sức khỏe tim mạch.',
      },
      {
        question: 'Nên dừng tập ngay khi nào?',
        options: [
          'Khi thấy hơi mệt bình thường',
          'Khi đổ mồ hôi',
          'Khi xuất hiện đau ngực hoặc khó thở bất thường',
          'Sau đúng 30 phút',
        ],
        correctIndex: 2,
        explanation: 'Đau ngực hoặc khó thở bất thường là dấu hiệu cần ngừng tập và tìm hỗ trợ y tế ngay.',
      },
      {
        question: 'Tại sao vận động đều đặn tốt hơn tập nhiều một lúc rồi nghỉ?',
        options: [
          'Vì tập nhiều một lúc thì mệt hơn',
          'Vì cơ thể cần thích nghi dần dần và duy trì thói quen đều đặn',
          'Vì chỉ cần tập một lần là đủ',
          'Vì tập nhiều một lúc gây huyết áp cao',
        ],
        correctIndex: 1,
        explanation: 'Cơ thể cần thích nghi dần và thói quen đều đặn mang lại lợi ích bền vững hơn cho tim mạch.',
      },
      {
        question: 'Bài tập nào sau đây NGƯỜI TĂNG HUYẾT ÁP NÊN TRÁNH?',
        options: ['Đi bộ nhanh', 'Đạp xe nhẹ nhàng', 'Bơi lội', 'Nâng tạ nặng kèm nín thở gắng sức'],
        correctIndex: 3,
        explanation: 'Nín thở gắng sức (nghiệm pháp Valsalva) làm tăng áp lực lồng ngực và khiến huyết áp tăng vọt đột ngột, rất nguy hiểm.',
      },
      {
        question: 'Khi bắt đầu một buổi tập thể dục, bước nào là bắt buộc?',
        options: ['Uống ngay 1 lít nước', 'Khởi động nhẹ nhàng', 'Đo huyết áp liên tục', 'Chạy nước rút 100m'],
        correctIndex: 1,
        explanation: 'Khởi động giúp nhịp tim và huyết áp tăng lên từ từ, giúp tim mạch và cơ bắp thích nghi an toàn trước khi tập luyện.',
      },
    ],
  },

  {
    id: 'bp_risk_habits',
    diseaseType: 'bloodPressure',
    emoji: '🚬',
    title: 'Những thói quen có thể làm huyết áp tăng',
    summary: 'Nhận biết các yếu tố trong sinh hoạt hằng ngày có thể ảnh hưởng đến huyết áp.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['huyết áp', 'lối sống', 'thói quen'],
    content: [
      {
        type: 'paragraph',
        text: 'Nhiều thói quen sinh hoạt hằng ngày có thể ảnh hưởng đến huyết áp theo thời gian. Nhận biết chúng giúp bạn có ý thức điều chỉnh dần dần.',
      },
      {
        type: 'bullet',
        title: 'Các yếu tố cần chú ý:',
        items: [
          'Stress kéo dài: Căng thẳng làm cơ thể tiết hormone có thể ảnh hưởng huyết áp.',
          'Thiếu ngủ: Ngủ không đủ giấc liên tục có thể ảnh hưởng đến điều hòa huyết áp.',
          'Ăn mặn: Lượng natri cao trong chế độ ăn làm tăng gánh nặng cho hệ tim mạch.',
          'Uống rượu bia: Tiêu thụ nhiều rượu bia có thể làm tăng huyết áp.',
          'Hút thuốc lá: Các chất trong khói thuốc tác động tiêu cực lên mạch máu.',
          'Ít vận động: Lối sống thụ động có liên quan đến sức khỏe tim mạch kém hơn.',
          'Không theo dõi chỉ số: Không biết huyết áp của mình thì không thể phát hiện vấn đề sớm.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Việc thay đổi thói quen là quá trình lâu dài. Hãy bắt đầu từ những điều nhỏ và bền vững, không cần thay đổi tất cả cùng lúc.',
      },
      {
        type: 'note',
        text: 'Theo dõi huyết áp đều đặn là cách tốt nhất để phát hiện sớm nếu có biến đổi bất thường.',
      },
      {
        type: 'paragraph',
        text: 'Bên cạnh đó, việc sử dụng các chất kích thích có chứa nhiều caffeine như cà phê hay nước tăng lực với lượng lớn mỗi ngày cũng có thể gây co mạch và làm tăng huyết áp ở một số người nhạy cảm.',
      },
    ],
    quiz: [
      {
        question: 'Yếu tố nào sau đây KHÔNG liên quan đến việc làm tăng huyết áp?',
        options: [
          'Căng thẳng kéo dài',
          'Uống nhiều nước lọc',
          'Hút thuốc lá',
          'Thiếu ngủ thường xuyên',
        ],
        correctIndex: 1,
        explanation: 'Uống đủ nước lọc không gây tăng huyết áp. Ngược lại, đây là thói quen tốt cho sức khỏe tổng thể.',
      },
      {
        question: 'Vì sao nên theo dõi huyết áp ngay cả khi cảm thấy khỏe mạnh?',
        options: [
          'Để có điều kiện mua máy đo',
          'Vì huyết áp cao có thể không có triệu chứng rõ ràng lúc đầu',
          'Vì bác sĩ yêu cầu bắt buộc',
          'Để khoe kết quả với người thân',
        ],
        correctIndex: 1,
        explanation: 'Huyết áp cao thường không có triệu chứng rõ ràng cho đến khi đã nặng. Theo dõi thường xuyên giúp phát hiện sớm.',
      },
      {
        question: 'Cách tốt nhất để bắt đầu thay đổi lối sống là gì?',
        options: [
          'Thay đổi tất cả cùng một lúc',
          'Bắt đầu từ những thay đổi nhỏ và duy trì bền vững',
          'Đợi đến khi bác sĩ yêu cầu',
          'Chỉ thay đổi khi có triệu chứng',
        ],
        correctIndex: 1,
        explanation: 'Thay đổi từ từ và bền vững dễ duy trì hơn so với thay đổi đột ngột nhiều thứ cùng lúc.',
      },
      {
        question: 'Caffeine trong cà phê hoặc nước tăng lực ảnh hưởng thế nào đến huyết áp?',
        options: ['Làm giảm huyết áp mạnh', 'Làm co mạch và có thể tăng huyết áp ở người nhạy cảm', 'Giúp mạch máu giãn nở tốt hơn', 'Không có bất kỳ tác động nào'],
        correctIndex: 1,
        explanation: 'Caffeine là chất kích thích có thể làm co mạch máu, khiến tim đập nhanh và tăng huyết áp tạm thời.',
      },
      {
        question: 'Vì sao việc thức khuya, thiếu ngủ liên tục lại có hại cho huyết áp?',
        options: ['Vì cơ thể không tiết đủ hormone điều hòa huyết áp', 'Vì thiếu ngủ làm tăng lượng đường huyết', 'Vì ngủ ít làm giảm cân nhanh', 'Vì ban đêm huyết áp luôn cao hơn ban ngày'],
        correctIndex: 0,
        explanation: 'Trong lúc ngủ sâu, huyết áp thường giảm để tim nghỉ ngơi. Việc thiếu ngủ khiến cơ thể căng thẳng và tiết ra nhiều hormone làm tăng huyết áp.',
      },
    ],
  },

  {
    id: 'bp_when_to_contact_doctor',
    diseaseType: 'bloodPressure',
    emoji: '👨‍⚕️',
    title: 'Khi nào cần liên hệ bác sĩ về huyết áp?',
    summary: 'Nhận biết các dấu hiệu cần tìm kiếm hỗ trợ y tế kịp thời.',
    estimatedMinutes: 3,
    level: 'basic',
    tags: ['huyết áp', 'cảnh báo', 'liên hệ bác sĩ'],
    content: [
      {
        type: 'paragraph',
        text: 'App giúp bạn theo dõi chỉ số và nhận cảnh báo khi có bất thường. Tuy nhiên, có những tình huống cần liên hệ trực tiếp với bác sĩ hoặc điều dưỡng.',
      },
      {
        type: 'bullet',
        title: 'Liên hệ bác sĩ khi:',
        items: [
          'Huyết áp cao hoặc thấp vượt ngưỡng cá nhân lặp lại nhiều lần liên tiếp.',
          'Có triệu chứng kèm theo: đau đầu dữ dội, chóng mặt mạnh, buồn nôn.',
          'Có dấu hiệu nghiêm trọng: đau ngực, khó thở, yếu liệt tay chân, nói khó.',
          'Khi có băn khoăn về thuốc hoặc muốn điều chỉnh phác đồ điều trị.',
        ],
      },
      {
        type: 'bullet',
        title: 'Những điều KHÔNG nên tự làm:',
        items: [
          'Không tự ý ngưng thuốc khi thấy chỉ số đã tốt hơn.',
          'Không tự tăng hoặc giảm liều thuốc mà không hỏi bác sĩ.',
          'Không dùng thêm thuốc của người khác.',
        ],
      },
      {
        type: 'note',
        text: 'Trong app, bạn có thể dùng tính năng nhắn tin để liên hệ với bác sĩ hoặc điều dưỡng phụ trách của mình.',
      },
      {
        type: 'paragraph',
        text: 'Tuy nhiên, đối với các trường hợp khẩn cấp như có dấu hiệu đột quỵ (méo miệng, yếu liệt nửa người, nói đớ), nhồi máu cơ tim (đau thắt ngực dữ dội lan ra tay trái, vã mồ hôi lạnh), cần gọi cấp cứu 115 ngay thay vì chờ phản hồi trên app.',
      },
    ],
    quiz: [
      {
        question: 'Bạn có thể tự ý ngưng thuốc khi thấy huyết áp đã về bình thường không?',
        options: [
          'Có, vì chỉ số đã tốt rồi',
          'Không, cần hỏi bác sĩ trước',
          'Có, nhưng giảm liều từ từ',
          'Chỉ ngưng vào cuối tuần',
        ],
        correctIndex: 1,
        explanation: 'Không được tự ý ngưng thuốc. Chỉ số tốt có thể là do thuốc đang phát huy tác dụng. Hãy hỏi bác sĩ trước khi thay đổi.',
      },
      {
        question: 'Dấu hiệu nào sau đây CẦN liên hệ y tế khẩn cấp?',
        options: [
          'Huyết áp cao hơn ngưỡng 3 mmHg',
          'Đau ngực kèm yếu liệt tay chân',
          'Hơi mệt sau khi nấu ăn',
          'Huyết áp bình thường nhưng thấy lo lắng',
        ],
        correctIndex: 1,
        explanation: 'Đau ngực kèm yếu liệt tay chân là dấu hiệu có thể của đột quỵ hoặc nhồi máu cơ tim — cần gọi cấp cứu ngay.',
      },
      {
        question: 'Cách liên hệ bác sĩ nào phù hợp cho câu hỏi thông thường trong app này?',
        options: [
          'Gọi cấp cứu 115',
          'Nhắn tin qua tính năng chat trong app',
          'Đến bệnh viện ngay',
          'Hỏi người thân',
        ],
        correctIndex: 1,
        explanation: 'Tính năng nhắn tin trong app giúp bạn liên hệ với bác sĩ hoặc điều dưỡng phụ trách cho những câu hỏi thông thường.',
      },
      {
        question: 'Dấu hiệu nào sau đây cảnh báo nguy cơ đột quỵ cần gọi 115 ngay?',
        options: ['Méo miệng, yếu liệt nửa người, nói đớ', 'Đau nhức cơ bắp chân', 'Khô miệng, khát nước', 'Sôi bụng, khó tiêu'],
        correctIndex: 0,
        explanation: 'Méo miệng, yếu liệt nửa người và nói khó là ba dấu hiệu kinh điển của đột quỵ, cần cấp cứu ngay lập tức trong "thời gian vàng".',
      },
      {
        question: 'Nếu bạn có thắc mắc về tác dụng phụ của loại thuốc huyết áp mới đổi, bạn nên làm gì?',
        options: [
          'Ngừng uống thuốc ngay lập tức',
          'Nhắn tin cho bác sĩ qua app để hỏi ý kiến',
          'Uống thêm thuốc cũ cho chắc',
          'Hỏi kinh nghiệm người hàng xóm'
        ],
        correctIndex: 1,
        explanation: 'App cung cấp kênh liên lạc an toàn giúp bạn trao đổi trực tiếp với bác sĩ về thuốc, tuyệt đối không nên tự ý ngưng thuốc.',
      },
    ],
  },

  // ===== NHÓM B — ĐÁI THÁO ĐƯỜNG =====
  {
    id: 'glucose_pre_post_meal',
    diseaseType: 'glucose',
    emoji: '🍽️',
    title: 'Đường huyết trước ăn và sau ăn là gì?',
    summary: 'Hiểu sự khác biệt giữa hai loại đường huyết và vì sao cả hai đều quan trọng.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['đường huyết', 'bữa ăn', 'theo dõi'],
    content: [
      {
        type: 'paragraph',
        text: 'Khi bạn nhập kết quả đường huyết vào app, hệ thống cần biết bạn đo vào thời điểm nào so với bữa ăn. Thông tin này rất quan trọng để bác sĩ đánh giá chính xác.',
      },
      {
        type: 'bullet',
        title: 'Đường huyết trước ăn (Pre-meal):',
        items: [
          'Đo khi chưa ăn gì, thường là lúc thức dậy buổi sáng hoặc trước bữa ăn.',
          'Còn gọi là đường huyết lúc đói.',
          'Cho biết cơ thể điều hòa đường huyết như thế nào trong trạng thái nghỉ.',
        ],
      },
      {
        type: 'bullet',
        title: 'Đường huyết sau ăn (Post-meal):',
        items: [
          'Thường đo sau bữa ăn khoảng 1–2 tiếng.',
          'Cho thấy cơ thể phản ứng với bữa ăn vừa rồi như thế nào.',
          'Hữu ích để đánh giá tác động của loại thức ăn bạn đã dùng.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Hai giá trị này có ý nghĩa khác nhau khi bác sĩ đánh giá. Ghi đúng thời điểm giúp bác sĩ hiểu đúng kết quả của bạn.',
      },
      {
        type: 'note',
        text: 'Khi nhập liệu vào app, hãy luôn chọn đúng "Trước ăn" hoặc "Sau ăn" để kết quả có giá trị theo dõi.',
      },
      {
        type: 'paragraph',
        text: 'Chỉ số đường huyết lúc đói (trước ăn) giúp đánh giá liều lượng thuốc nền đang dùng, trong khi chỉ số đường huyết sau ăn phản ánh khả năng xử lý lượng carbohydrate (tinh bột, đường) từ bữa ăn của cơ thể.',
      },
    ],
    quiz: [
      {
        question: 'Đường huyết "trước ăn" thường được đo khi nào?',
        options: [
          'Sau bữa ăn 30 phút',
          'Ngay lúc thức dậy hoặc trước bữa ăn, khi chưa ăn gì',
          'Sau khi tập thể dục',
          'Bất kỳ lúc nào trong ngày',
        ],
        correctIndex: 1,
        explanation: 'Đường huyết trước ăn (lúc đói) được đo khi chưa ăn gì, thường là buổi sáng ngay sau khi thức dậy.',
      },
      {
        question: 'Vì sao cần ghi rõ "Trước ăn" hay "Sau ăn" khi nhập liệu vào app?',
        options: [
          'Để app trông đẹp hơn',
          'Vì hai thời điểm có ý nghĩa khác nhau khi bác sĩ đánh giá',
          'Vì app không hoạt động nếu không chọn',
          'Để tính tiền khám bệnh',
        ],
        correctIndex: 1,
        explanation: 'Đường huyết trước và sau ăn phản ánh các khía cạnh khác nhau về chuyển hóa glucose. Bác sĩ cần thông tin này để đánh giá đúng.',
      },
      {
        question: 'Đường huyết sau ăn thường được đo sau bữa ăn bao lâu?',
        options: ['Ngay sau khi ăn', '1–2 tiếng sau ăn', '4 tiếng sau ăn', 'Sau 8 tiếng'],
        correctIndex: 1,
        explanation: 'Thông thường đường huyết sau ăn được đo khoảng 1–2 tiếng sau bữa ăn, theo hướng dẫn của bác sĩ.',
      },
      {
        question: 'Chỉ số đường huyết "sau ăn" phản ánh điều gì?',
        options: [
          'Khả năng cơ thể xử lý lượng carbohydrate (tinh bột) từ thức ăn',
          'Lượng nước đã uống trong ngày',
          'Khả năng hấp thu chất béo của dạ dày',
          'Mức độ buồn ngủ sau ăn'
        ],
        correctIndex: 0,
        explanation: 'Đường huyết sau ăn cho thấy cơ thể (đặc biệt là insulin) hoạt động hiệu quả ra sao để đưa lượng đường mới ăn vào các tế bào.',
      },
      {
        question: 'Đường huyết "lúc đói" (trước ăn) thường mang lại thông tin gì cho bác sĩ?',
        options: [
          'Cho biết bệnh nhân có ăn vặt đêm không',
          'Giúp đánh giá hiệu quả của liều thuốc nền và khả năng kiểm soát đường huyết cơ bản của cơ thể',
          'Cho biết mức độ căng thẳng hiện tại',
          'Để biết hôm nay bệnh nhân ăn sáng món gì'
        ],
        correctIndex: 1,
        explanation: 'Đường huyết lúc đói phản ánh lượng đường do gan sản xuất và hiệu quả của thuốc điều trị kéo dài qua đêm.',
      },
    ],
  },

  {
    id: 'glucose_why_record_timing',
    diseaseType: 'glucose',
    emoji: '⏱️',
    title: 'Vì sao cần ghi thời điểm đo đường huyết?',
    summary: 'Hiểu tầm quan trọng của việc ghi chú thời điểm đo để bác sĩ theo dõi chính xác.',
    estimatedMinutes: 3,
    level: 'basic',
    tags: ['đường huyết', 'ghi chép', 'theo dõi'],
    content: [
      {
        type: 'paragraph',
        text: 'Đường huyết không phải là con số cố định — nó thay đổi liên tục trong ngày tùy theo nhiều yếu tố. Vì vậy, thời điểm đo rất quan trọng.',
      },
      {
        type: 'bullet',
        title: 'Đường huyết thay đổi do:',
        items: [
          'Bữa ăn: Ăn nhiều tinh bột, đường làm đường huyết tăng sau ăn.',
          'Vận động: Vận động thường làm đường huyết giảm.',
          'Thuốc: Thuốc điều trị tác động trực tiếp lên đường huyết.',
          'Stress: Hormone stress có thể làm đường huyết tăng.',
          'Giấc ngủ: Thiếu ngủ ảnh hưởng đến chuyển hóa glucose.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Nếu không ghi thời điểm đo, bác sĩ sẽ không biết con số đó có nghĩa gì — đo trước ăn 100 mg/dL khác hoàn toàn với đo sau ăn 100 mg/dL.',
      },
      {
        type: 'note',
        text: 'Trong app, hãy luôn chọn đúng mealTiming (Trước ăn / Sau ăn) để dữ liệu của bạn có giá trị y tế cao nhất.',
      },
      {
        type: 'paragraph',
        text: 'Một mức đường huyết 180 mg/dL có thể là bình thường nếu được đo ngay sau một bữa tiệc lớn, nhưng lại là dấu hiệu cảnh báo nghiêm trọng nếu đó là mức đường huyết đo được vào lúc đói buổi sáng.',
      },
    ],
    quiz: [
      {
        question: 'Tại sao đường huyết lại khác nhau ở các thời điểm trong ngày?',
        options: [
          'Vì máy đo không chính xác',
          'Vì đường huyết thay đổi theo bữa ăn, vận động, thuốc và stress',
          'Vì trời nóng hay lạnh',
          'Vì tuổi tác',
        ],
        correctIndex: 1,
        explanation: 'Nhiều yếu tố như bữa ăn, vận động, thuốc và căng thẳng đều ảnh hưởng đến đường huyết, khiến nó thay đổi trong ngày.',
      },
      {
        question: 'Điều gì xảy ra nếu bạn không ghi thời điểm đo đường huyết trong app?',
        options: [
          'Không có gì xảy ra',
          'App tự điền vào',
          'Bác sĩ khó hiểu ý nghĩa của kết quả',
          'Chỉ số tự động bị xóa',
        ],
        correctIndex: 2,
        explanation: 'Không có thông tin thời điểm, bác sĩ không thể biết con số đó đại diện cho trạng thái nào của cơ thể bạn.',
      },
      {
        question: 'Vận động thể chất thường ảnh hưởng đến đường huyết như thế nào?',
        options: ['Làm tăng đường huyết', 'Không ảnh hưởng', 'Thường làm giảm đường huyết', 'Làm đường huyết lúc tăng lúc giảm ngẫu nhiên'],
        correctIndex: 2,
        explanation: 'Vận động thể chất thường giúp cơ bắp sử dụng glucose, từ đó làm giảm đường huyết.',
      },
      {
        question: 'Kết quả 180 mg/dL có ý nghĩa như thế nào?',
        options: [
          'Luôn luôn là mức rất nguy hiểm',
          'Luôn luôn là mức bình thường',
          'Có thể bình thường nếu đo sau bữa ăn lớn, nhưng là cảnh báo nếu đo lúc đói',
          'Chứng tỏ máy đo bị hỏng'
        ],
        correctIndex: 2,
        explanation: 'Ý nghĩa của con số phụ thuộc hoàn toàn vào bối cảnh (thời điểm đo). 180 mg/dL sau ăn 1 giờ có thể chấp nhận được, nhưng lúc đói thì quá cao.',
      },
      {
        question: 'Một giấc ngủ kém chất lượng (thiếu ngủ) có tác động gì đến đường huyết?',
        options: ['Làm giảm mạnh đường huyết', 'Không tác động gì', 'Có thể làm giảm khả năng nhạy cảm với insulin, dẫn đến tăng đường huyết', 'Giúp đường huyết ổn định hơn'],
        correctIndex: 2,
        explanation: 'Thiếu ngủ làm cơ thể căng thẳng và giảm độ nhạy insulin, khiến đường huyết có xu hướng cao hơn vào ngày hôm sau.',
      },
    ],
  },

  {
    id: 'glucose_hypoglycemia_signs',
    diseaseType: 'glucose',
    emoji: '😵',
    title: 'Dấu hiệu hạ đường huyết cần chú ý',
    summary: 'Nhận biết các triệu chứng khi đường huyết xuống thấp để xử lý kịp thời.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['đường huyết', 'hạ đường huyết', 'cảnh báo'],
    content: [
      {
        type: 'paragraph',
        text: 'Hạ đường huyết xảy ra khi lượng đường trong máu xuống thấp hơn mức bình thường. Đây là tình trạng cần nhận biết sớm và xử lý đúng cách.',
      },
      {
        type: 'bullet',
        title: 'Các dấu hiệu thường gặp:',
        items: [
          'Run tay, run chân.',
          'Vã mồ hôi dù không nóng hoặc vừa vận động.',
          'Đói cồn cào, bụng đói bất thường.',
          'Hồi hộp, tim đập nhanh.',
          'Chóng mặt, mệt bất thường.',
          'Khó tập trung, lơ mơ, bứt rứt.',
        ],
      },
      {
        type: 'bullet',
        title: 'Khi nghi ngờ hạ đường huyết:',
        items: [
          'Kiểm tra đường huyết ngay nếu có thiết bị đo.',
          'Ngồi nghỉ ở nơi an toàn.',
          'Liên hệ người thân hoặc nhân viên y tế nếu cảm thấy không tỉnh táo.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Hướng dẫn xử lý cụ thể phụ thuộc vào tình trạng của từng người. Hãy hỏi bác sĩ của bạn về cách xử lý hạ đường huyết phù hợp với tình trạng cá nhân.',
      },
      {
        type: 'note',
        text: 'Nếu bạn mất ý thức hoặc không thể tự xử lý, người xung quanh cần gọi hỗ trợ y tế khẩn cấp ngay.',
      },
      {
        type: 'paragraph',
        text: 'Quy tắc "15-15" thường được khuyến nghị để xử lý hạ đường huyết nhẹ: Ăn hoặc uống 15 gram carbohydrate tác dụng nhanh (như nửa ly nước ép trái cây, hoặc 3-4 viên kẹo), sau đó đợi 15 phút rồi đo lại. Nếu vẫn thấp, lặp lại quá trình này.',
      },
    ],
    quiz: [
      {
        question: 'Triệu chứng nào KHÔNG phải là dấu hiệu hạ đường huyết?',
        options: ['Run tay', 'Đói cồn cào', 'Vã mồ hôi', 'Nước tiểu nhiều và trong'],
        correctIndex: 3,
        explanation: 'Nước tiểu nhiều và trong thường liên quan đến tăng đường huyết, không phải hạ đường huyết.',
      },
      {
        question: 'Khi nghi ngờ hạ đường huyết, bước đầu tiên nên làm là gì?',
        options: [
          'Tiếp tục công việc và chờ tự khỏi',
          'Kiểm tra đường huyết và ngồi nghỉ ở nơi an toàn',
          'Ăn thật nhiều để bù lại',
          'Uống thêm thuốc',
        ],
        correctIndex: 1,
        explanation: 'Kiểm tra đường huyết giúp xác nhận tình trạng, và ngồi nghỉ ở nơi an toàn là bước bảo vệ bản thân đầu tiên.',
      },
      {
        question: 'Khi nào cần gọi hỗ trợ y tế khẩn cấp trong trường hợp hạ đường huyết?',
        options: [
          'Khi hơi run tay nhẹ',
          'Khi đói cồn cào',
          'Khi người bệnh mất ý thức hoặc không thể tự xử lý',
          'Khi đường huyết chỉ thấp hơn bình thường 1 đơn vị',
        ],
        correctIndex: 2,
        explanation: 'Mất ý thức là tình trạng nguy hiểm cần gọi cấp cứu ngay, không chờ đợi.',
      },
      {
        question: 'Quy tắc "15-15" trong xử lý hạ đường huyết nhẹ là gì?',
        options: [
          'Chạy bộ 15 phút, nghỉ 15 phút',
          'Ăn 15g carbohydrate tác dụng nhanh, đợi 15 phút đo lại',
          'Đo đường huyết mỗi 15 phút trong 15 giờ',
          'Uống 15 viên thuốc và đợi 15 phút'
        ],
        correctIndex: 1,
        explanation: 'Quy tắc "15-15" giúp nâng đường huyết lên mức an toàn một cách từ từ, tránh làm đường huyết tăng vọt quá mức sau đó.',
      },
      {
        question: 'Thực phẩm nào sau đây là TỐT NHẤT để áp dụng quy tắc 15g carbohydrate?',
        options: ['Một miếng thịt mỡ', 'Nửa ly nước ép trái cây ngọt hoặc 3 viên kẹo ngọt', 'Một đĩa rau luộc to', 'Một chén phở lớn'],
        correctIndex: 1,
        explanation: 'Nước ép hoặc kẹo ngọt chứa carbohydrate đơn giản, giúp hấp thu vào máu rất nhanh để cấp cứu hạ đường huyết.',
      },
    ],
  },

  {
    id: 'glucose_why_spikes',
    diseaseType: 'glucose',
    emoji: '📈',
    title: 'Vì sao đường huyết có thể tăng sau ăn?',
    summary: 'Hiểu các yếu tố làm đường huyết tăng để điều chỉnh sinh hoạt phù hợp.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['đường huyết', 'bữa ăn', 'tinh bột'],
    content: [
      {
        type: 'paragraph',
        text: 'Đường huyết tự nhiên tăng sau bữa ăn vì cơ thể đang tiêu hóa thức ăn. Tuy nhiên, mức tăng và thời gian tăng phụ thuộc vào nhiều yếu tố.',
      },
      {
        type: 'bullet',
        title: 'Các yếu tố làm đường huyết tăng nhanh hơn sau ăn:',
        items: [
          'Bữa ăn nhiều tinh bột và đường: Cơm, bánh mì, bún phở, nước ngọt, bánh kẹo.',
          'Ăn quá nhanh: Cơ thể khó điều tiết kịp khi thức ăn vào quá nhanh.',
          'Khẩu phần quá lớn: Lượng tinh bột nhiều làm đường huyết tăng cao hơn.',
          'Ít vận động sau ăn: Không sử dụng glucose nên nó tích lũy trong máu lâu hơn.',
          'Quên thuốc hoặc dùng thuốc không đúng hướng dẫn của bác sĩ.',
          'Stress, lo lắng, hay mất ngủ: Hormone stress có thể làm tăng đường huyết.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Không phải mọi sự tăng đường huyết sau ăn đều nguy hiểm. Điều quan trọng là theo dõi xu hướng và thông báo cho bác sĩ khi có bất thường lặp lại.',
      },
      {
        type: 'note',
        text: 'Ghi chú trong app sau khi ăn (đã ăn gì, ăn bao nhiêu) giúp bác sĩ hiểu rõ hơn nguyên nhân biến động đường huyết của bạn.',
      },
      {
        type: 'paragraph',
        text: 'Chỉ số đường huyết (GI) của thực phẩm cũng ảnh hưởng lớn. Thực phẩm GI cao (bánh mì trắng, gạo trắng, kẹo ngọt) làm đường huyết tăng vọt rất nhanh, trong khi thực phẩm GI thấp (yến mạch, ngũ cốc nguyên cám, rau xanh) giúp đường huyết tăng từ từ và ổn định hơn.',
      },
    ],
    quiz: [
      {
        question: 'Thức ăn nào làm đường huyết tăng nhanh nhất sau ăn?',
        options: [
          'Rau xanh luộc',
          'Thịt nạc hấp',
          'Cơm, bún, bánh mì, nước ngọt',
          'Trứng chiên',
        ],
        correctIndex: 2,
        explanation: 'Thực phẩm giàu tinh bột và đường như cơm, bún, nước ngọt làm đường huyết tăng nhanh hơn sau ăn.',
      },
      {
        question: 'Stress ảnh hưởng đến đường huyết như thế nào?',
        options: [
          'Không ảnh hưởng',
          'Làm đường huyết giảm',
          'Hormone stress có thể làm đường huyết tăng',
          'Chỉ ảnh hưởng khi bị đái tháo đường',
        ],
        correctIndex: 2,
        explanation: 'Stress kích thích cơ thể tiết hormone như cortisol, có thể làm đường huyết tăng dù không ăn thêm.',
      },
      {
        question: 'Thói quen nào có thể giúp đường huyết sau ăn không tăng quá cao?',
        options: [
          'Nằm nghỉ ngay sau ăn',
          'Đi bộ nhẹ 15–20 phút sau bữa ăn',
          'Ăn thật nhanh để xong sớm',
          'Uống thêm nước ngọt để dễ tiêu hóa',
        ],
        correctIndex: 1,
        explanation: 'Đi bộ nhẹ sau ăn giúp cơ bắp sử dụng glucose, giảm mức đỉnh đường huyết sau bữa ăn.',
      },
      {
        question: 'Ăn quá nhanh có thể gây ra điều gì cho đường huyết?',
        options: ['Không ảnh hưởng gì', 'Làm đường huyết tăng vọt do cơ thể không kịp điều tiết', 'Giúp tiêu hóa tốt hơn', 'Làm hạ đường huyết'],
        correctIndex: 1,
        explanation: 'Ăn quá nhanh khiến một lượng lớn glucose đi vào máu cùng lúc, làm cơ thể không kịp tiết đủ insulin để xử lý, gây tăng vọt đường huyết.',
      },
      {
        question: 'Chỉ số đường huyết (GI) của thực phẩm có ý nghĩa gì?',
        options: ['Cho biết thực phẩm đó có giá trị dinh dưỡng cao hay thấp', 'Phản ánh tốc độ làm tăng đường huyết sau khi ăn thực phẩm đó', 'Đo lượng đường có trong một gam thức ăn', 'Không có ý nghĩa gì đối với người bệnh tiểu đường'],
        correctIndex: 1,
        explanation: 'GI (Glycemic Index) đo lường tốc độ một loại thực phẩm chứa carbohydrate làm tăng đường huyết. Thực phẩm GI cao làm đường huyết tăng nhanh hơn.',
      },
    ],
  },

  {
    id: 'glucose_meal_portion',
    diseaseType: 'glucose',
    title: 'Kiểm soát khẩu phần ăn cho người đái tháo đường',
    summary: 'Nguyên tắc ăn uống cân bằng giúp duy trì đường huyết ổn định.',
    estimatedMinutes: 5,
    level: 'basic',
    tags: ['đường huyết', 'dinh dưỡng', 'khẩu phần'],
    content: [
      {
        type: 'paragraph',
        text: 'Người theo dõi đường huyết không cần nhịn ăn hay ăn kiêng cực đoan. Điều quan trọng là ăn uống cân bằng và kiểm soát khẩu phần hợp lý.',
      },
      {
        type: 'bullet',
        title: 'Nguyên tắc cơ bản:',
        items: [
          'Không bỏ bữa — ăn đều đặn giúp tránh dao động đường huyết lớn.',
          'Cân bằng giữa rau củ, protein (thịt, đậu) và tinh bột.',
          'Ăn nhiều rau, ít cơm hơn nếu muốn kiểm soát lượng tinh bột.',
          'Chia khẩu phần vừa phải — không ăn quá no một lần.',
        ],
      },
      {
        type: 'bullet',
        title: 'Hạn chế:',
        items: [
          'Nước ngọt, nước ép trái cây đóng hộp, trà đường, cà phê sữa đường.',
          'Bánh kẹo, chè ngọt, xôi ngọt.',
          'Thực phẩm chiên nhiều dầu mỡ kết hợp với nhiều tinh bột.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Hãy theo dõi đường huyết sau các bữa ăn khác nhau để biết cơ thể bạn phản ứng thế nào với từng loại thức ăn. Thông tin này rất hữu ích cho bác sĩ.',
      },
      {
        type: 'note',
        text: 'Chế độ ăn cụ thể nên được thảo luận với bác sĩ hoặc chuyên gia dinh dưỡng của bạn, vì mỗi người có nhu cầu khác nhau.',
      },
      {
        type: 'paragraph',
        text: 'Một phương pháp dễ áp dụng là "Quy tắc Đĩa thức ăn": Chia đĩa ăn làm 4 phần, 2 phần (một nửa đĩa) là rau xanh không tinh bột, 1 phần là đạm (thịt, cá, trứng, đậu), và 1 phần còn lại là tinh bột (cơm gạo lứt, khoai lang, bánh mì nguyên cám).',
      },
    ],
    quiz: [
      {
        question: 'Người theo dõi đường huyết có cần nhịn ăn hoàn toàn không?',
        options: [
          'Có, cần nhịn ăn hoàn toàn',
          'Không, cần ăn đều đặn và cân bằng',
          'Chỉ ăn một bữa mỗi ngày',
          'Chỉ ăn rau và protein',
        ],
        correctIndex: 1,
        explanation: 'Nhịn ăn có thể gây hạ đường huyết và dao động lớn. Ăn đều đặn và cân bằng là cách tốt hơn.',
      },
      {
        question: 'Loại đồ uống nào nên hạn chế nhất để kiểm soát đường huyết?',
        options: ['Nước lọc', 'Trà không đường', 'Nước ngọt có ga', 'Nước dừa ít ngọt'],
        correctIndex: 2,
        explanation: 'Nước ngọt có ga chứa nhiều đường, làm đường huyết tăng nhanh và khó kiểm soát.',
      },
      {
        question: 'Vì sao việc theo dõi đường huyết sau từng bữa ăn lại có ích?',
        options: [
          'Để biết ăn ngon hay không',
          'Để biết cơ thể phản ứng thế nào với từng loại thức ăn',
          'Để kiểm tra máy đo có chính xác không',
          'Vì bắt buộc phải làm vậy',
        ],
        correctIndex: 1,
        explanation: 'Mỗi người phản ứng khác nhau với thức ăn. Theo dõi giúp bạn và bác sĩ biết loại thức ăn nào ảnh hưởng mạnh đến đường huyết của riêng bạn.',
      },
      {
        question: 'Theo "Quy tắc Đĩa thức ăn", rau xanh nên chiếm bao nhiêu phần của đĩa?',
        options: ['1/4 (Một phần tư)', '1/2 (Một nửa)', '3/4', 'Toàn bộ đĩa'],
        correctIndex: 1,
        explanation: 'Một nửa đĩa (2/4) nên là các loại rau không chứa nhiều tinh bột để cung cấp chất xơ, vitamin và làm chậm quá trình hấp thu đường.',
      },
      {
        question: 'Việc bỏ bữa (nhịn đói) có giúp kiểm soát đường huyết tốt hơn không?',
        options: ['Có, vì không ăn thì đường không tăng', 'Có, nó giúp giảm cân nhanh', 'Không, vì có thể gây hạ đường huyết hoặc làm đường huyết dao động mạnh sau đó', 'Có, nếu chỉ uống nước lọc'],
        correctIndex: 2,
        explanation: 'Bỏ bữa có thể làm hạ đường huyết nguy hiểm và thường dẫn đến ăn bù quá nhiều ở bữa sau, gây tăng vọt đường huyết.',
      },
    ],
  },

  {
    id: 'glucose_home_monitoring',
    diseaseType: 'glucose',
    title: 'Theo dõi đường huyết tại nhà thế nào cho có ích?',
    summary: 'Cách theo dõi đường huyết đúng cách để dữ liệu có giá trị cho bác sĩ.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['đường huyết', 'theo dõi', 'ghi chép'],
    content: [
      {
        type: 'paragraph',
        text: 'Việc đo đường huyết tại nhà rất có giá trị, nhưng chỉ khi được thực hiện đúng cách và ghi lại đầy đủ thông tin.',
      },
      {
        type: 'bullet',
        title: 'Thực hành tốt khi theo dõi tại nhà:',
        items: [
          'Đo theo lịch mà bác sĩ hướng dẫn — không cần đo quá nhiều lần nếu không được chỉ định.',
          'Ghi lại ngay sau khi đo: Chỉ số, thời điểm (trước/sau ăn), giờ đo.',
          'Ghi chú thêm nếu bữa ăn bất thường, vừa vận động nhiều, hoặc đang mệt.',
          'Ghi chú nếu quên thuốc hoặc dùng muộn hơn bình thường.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Xem xu hướng của nhiều ngày quan trọng hơn nhiều so với một lần đo đơn lẻ. Một kết quả cao không có nghĩa là nguy hiểm, nhưng nhiều kết quả cao liên tục cần được chú ý.',
      },
      {
        type: 'note',
        text: 'App của bạn lưu lịch sử và hiển thị đồ thị giúp bạn và bác sĩ thấy xu hướng dễ dàng hơn.',
      },
      {
        type: 'paragraph',
        text: 'Lưu ý khi lấy máu ngẫu nhiên tại nhà: Hãy rửa tay thật sạch bằng xà phòng và nước ấm, sau đó lau khô hoàn toàn trước khi lấy máu. Các vết dính từ thức ăn ngọt (như trái cây) trên ngón tay có thể làm kết quả đường huyết đo được cao hơn rất nhiều so với thực tế.',
      },
    ],
    quiz: [
      {
        question: 'Điều quan trọng hơn khi theo dõi đường huyết là gì?',
        options: [
          'Một lần đo chính xác tuyệt đối',
          'Xu hướng của nhiều ngày liên tục',
          'Đo càng nhiều lần càng tốt',
          'Chỉ đo khi cảm thấy không khỏe',
        ],
        correctIndex: 1,
        explanation: 'Xu hướng qua nhiều ngày cho thấy mức kiểm soát đường huyết thực sự, quan trọng hơn một lần đo riêng lẻ.',
      },
      {
        question: 'Bạn nên ghi chú gì khi nhập liệu vào app?',
        options: [
          'Chỉ cần số đường huyết',
          'Số đường huyết, thời điểm đo, và các thông tin liên quan như bữa ăn, vận động',
          'Chỉ ghi nếu kết quả bất thường',
          'Không cần ghi chú gì thêm',
        ],
        correctIndex: 1,
        explanation: 'Các thông tin bổ sung giúp bác sĩ hiểu bối cảnh của từng con số và đánh giá chính xác hơn.',
      },
      {
        question: 'Nên đo đường huyết tại nhà theo tần suất nào?',
        options: [
          'Càng nhiều lần càng tốt',
          'Theo lịch và hướng dẫn của bác sĩ',
          'Chỉ khi thấy mệt',
          'Mỗi 30 phút một lần',
        ],
        correctIndex: 1,
        explanation: 'Bác sĩ sẽ hướng dẫn tần suất phù hợp với tình trạng của bạn. Tự ý đo quá nhiều không nhất thiết có lợi hơn.',
      },
      {
        question: 'Điều gì có thể xảy ra nếu bạn không rửa tay trước khi đo đường huyết?',
        options: ['Máy đo sẽ không hoạt động', 'Vết bẩn thực phẩm (như đường từ trái cây) có thể làm kết quả sai lệch (thường cao hơn)', 'Kim không đâm qua được da', 'Không có vấn đề gì'],
        correctIndex: 1,
        explanation: 'Bất kỳ cặn thức ăn chứa đường nào trên ngón tay đều sẽ hòa vào mẫu máu và làm máy đo hiển thị kết quả cao sai lệch.',
      },
      {
        question: 'Vì sao rửa tay bằng nước ấm trước khi đo lại có ích?',
        options: ['Nước ấm tiêu diệt toàn bộ vi khuẩn', 'Nước ấm làm tăng lượng đường trong máu', 'Nước ấm giúp tăng cường lưu thông máu ở ngón tay, giúp dễ lấy mẫu máu hơn', 'Nước ấm làm giảm đau'],
        correctIndex: 2,
        explanation: 'Rửa tay bằng nước ấm giúp giãn mạch máu ở đầu ngón tay, giúp máu chảy ra dễ dàng hơn khi dùng kim chích.',
      },
    ],
  },

  {
    id: 'glucose_when_to_contact_doctor',
    diseaseType: 'glucose',
    title: 'Khi nào cần liên hệ bác sĩ về đường huyết?',
    summary: 'Nhận biết các dấu hiệu cần tìm kiếm hỗ trợ y tế về đường huyết.',
    estimatedMinutes: 3,
    level: 'basic',
    tags: ['đường huyết', 'cảnh báo', 'liên hệ bác sĩ'],
    content: [
      {
        type: 'paragraph',
        text: 'Không phải mọi biến động đường huyết đều cần liên hệ bác sĩ ngay, nhưng có những tình huống không nên chờ đợi.',
      },
      {
        type: 'bullet',
        title: 'Liên hệ bác sĩ khi:',
        items: [
          'Đường huyết liên tục vượt ngưỡng cá nhân nhiều ngày liên tiếp.',
          'Có triệu chứng hạ đường huyết lặp lại dù ăn đều đặn.',
          'Buồn nôn, nôn nhiều, không ăn được.',
          'Khát nước nhiều bất thường, tiểu nhiều, mệt nhiều.',
          'Vết thương lâu lành hơn bình thường.',
        ],
      },
      {
        type: 'bullet',
        title: 'Không nên tự làm:',
        items: [
          'Không tự ý ngừng hoặc đổi thuốc.',
          'Không tự tăng liều thuốc khi thấy đường huyết cao.',
          'Không dùng thảo dược hoặc sản phẩm chức năng thay thuốc mà không hỏi bác sĩ.',
        ],
      },
      {
        type: 'note',
        text: 'Khi không chắc chắn, hãy liên hệ bác sĩ hoặc điều dưỡng qua tính năng nhắn tin trong app. Không nên tự quyết định khi còn băn khoăn.',
      },
      {
        type: 'paragraph',
        text: 'Đặc biệt, nếu bạn đang bị bệnh lý khác (như cảm cúm, sốt cao, hoặc nhiễm trùng dạ dày), đường huyết thường có xu hướng tăng cao hoặc khó kiểm soát hơn. Đây là giai đoạn bạn cần đo thường xuyên hơn và báo cáo cho bác sĩ.',
      },
    ],
    quiz: [
      {
        question: 'Bạn có thể tự tăng liều thuốc khi thấy đường huyết cao không?',
        options: [
          'Có, nếu đường huyết cao nhiều',
          'Không, cần hỏi bác sĩ trước',
          'Có, nhưng chỉ tăng một chút',
          'Có, vì mình biết cơ thể mình nhất',
        ],
        correctIndex: 1,
        explanation: 'Tự điều chỉnh thuốc có thể gây nguy hiểm. Hãy luôn hỏi bác sĩ trước khi thay đổi liều.',
      },
      {
        question: 'Triệu chứng nào nên liên hệ bác sĩ sớm?',
        options: [
          'Đường huyết cao một lần sau bữa ăn nhiều tinh bột',
          'Khát nước nhiều bất thường và tiểu nhiều kéo dài',
          'Hơi mệt sau khi làm việc cả ngày',
          'Đường huyết trong ngưỡng bình thường của bạn',
        ],
        correctIndex: 1,
        explanation: 'Khát nhiều và tiểu nhiều kéo dài là dấu hiệu đường huyết có thể đang không được kiểm soát tốt, cần báo cho bác sĩ.',
      },
      {
        question: 'Nếu không chắc về tình trạng sức khỏe, bạn nên làm gì?',
        options: [
          'Tự tìm kiếm thông tin trên mạng và tự xử lý',
          'Chờ xem có tự khỏi không',
          'Liên hệ bác sĩ hoặc điều dưỡng qua app',
          'Hỏi người thân để quyết định',
        ],
        correctIndex: 2,
        explanation: 'App có tính năng nhắn tin để liên hệ trực tiếp với bác sĩ hoặc điều dưỡng phụ trách của bạn.',
      },
      {
        question: 'Khi bạn bị ốm (như cảm cúm, sốt), điều gì thường xảy ra với đường huyết?',
        options: ['Luôn luôn giảm mạnh', 'Đường huyết thường có xu hướng tăng cao và khó kiểm soát', 'Không thay đổi', 'Về mức bình thường tuyệt đối'],
        correctIndex: 1,
        explanation: 'Khi cơ thể bị ốm, nó tiết ra các hormone để chống lại bệnh tật. Các hormone này có thể làm giảm tác dụng của insulin, dẫn đến tăng đường huyết.',
      },
      {
        question: 'Việc vết thương lâu lành liên quan như thế nào đến đường huyết?',
        options: ['Không có sự liên quan', 'Là dấu hiệu đường huyết quá thấp', 'Là dấu hiệu đường huyết liên tục ở mức cao gây tổn thương mạch máu nhỏ và giảm miễn dịch', 'Chỉ xảy ra khi dùng quá nhiều thuốc'],
        correctIndex: 2,
        explanation: 'Đường huyết cao mãn tính làm hẹp mạch máu và giảm chức năng của tế bào bạch cầu, khiến các vết thương khó lành và dễ nhiễm trùng hơn.',
      },
    ],
  },

  // ===== NHÓM C — THEO DÕI CHỈ SỐ SINH TỒN =====
  {
    id: 'vitals_why_daily',
    diseaseType: 'general',
    emoji: '📅',
    title: 'Vì sao cần theo dõi chỉ số sức khỏe hằng ngày?',
    summary: 'Hiểu lợi ích của việc theo dõi sức khỏe đều đặn với bác sĩ từ xa.',
    estimatedMinutes: 3,
    level: 'basic',
    tags: ['theo dõi', 'sinh hiệu', 'chăm sóc từ xa'],
    content: [
      {
        type: 'paragraph',
        text: 'Hệ thống theo dõi từ xa của bạn hoạt động hiệu quả nhất khi có dữ liệu đều đặn. Khi bạn nhập chỉ số thường xuyên, bác sĩ có đủ thông tin để hỗ trợ bạn tốt hơn.',
      },
      {
        type: 'bullet',
        title: 'Lợi ích của việc theo dõi đều đặn:',
        items: [
          'Giúp bác sĩ thấy xu hướng — tốt lên hay xấu đi theo thời gian.',
          'Phát hiện sớm bất thường trước khi trở thành vấn đề nghiêm trọng.',
          'Giúp bạn hiểu cơ thể mình hơn và nhận ra điều gì ảnh hưởng đến sức khỏe.',
          'Hỗ trợ bác sĩ đưa ra quyết định điều trị phù hợp hơn.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Bạn không cần đo khi cảm thấy mệt mới quan trọng — việc theo dõi lúc bình thường cũng cần thiết để có dữ liệu nền so sánh.',
      },
      {
        type: 'note',
        text: 'Nếu có ngày không đo được, không sao — hãy tiếp tục vào ngày hôm sau. Dữ liệu đều đặn theo thời gian quan trọng hơn mỗi ngày một lần.',
      },
      {
        type: 'paragraph',
        text: 'Mỗi cá nhân có một mức "bình thường" khác nhau. Việc đo thường xuyên lúc bạn khỏe mạnh giúp thiết lập đường cơ sở (baseline) này. Khi có bất kỳ sự thay đổi tinh tế nào, bác sĩ sẽ dễ dàng nhận ra thông qua đường cơ sở đó thay vì so sánh với một ngưỡng chung chung.',
      },
    ],
    quiz: [
      {
        question: 'Tại sao dữ liệu sức khỏe đều đặn có giá trị hơn chỉ đo khi mệt?',
        options: [
          'Vì máy đo hoạt động tốt hơn khi không bệnh',
          'Vì dữ liệu đều đặn cho thấy xu hướng và có dữ liệu nền để so sánh',
          'Vì app cần đủ dữ liệu để kiếm tiền',
          'Không có lý do gì cả',
        ],
        correctIndex: 1,
        explanation: 'Dữ liệu đều đặn giúp thấy xu hướng thay đổi theo thời gian và phát hiện bất thường sớm hơn.',
      },
      {
        question: 'Ai được lợi nhiều nhất từ việc bạn theo dõi sức khỏe đều đặn?',
        options: [
          'Chỉ bác sĩ',
          'Chỉ bạn',
          'Cả bạn và bác sĩ',
          'Chỉ gia đình',
        ],
        correctIndex: 2,
        explanation: 'Cả bạn (hiểu cơ thể hơn) và bác sĩ (có đủ dữ liệu để hỗ trợ tốt hơn) đều hưởng lợi.',
      },
      {
        question: 'Nếu bỏ sót một ngày không đo, bạn nên làm gì?',
        options: [
          'Nhập dữ liệu giả cho ngày đó',
          'Bỏ cuộc hoàn toàn',
          'Tiếp tục đo từ ngày hôm sau',
          'Đo bù gấp đôi ngày hôm sau',
        ],
        correctIndex: 2,
        explanation: 'Nếu bỏ sót một ngày, chỉ cần tiếp tục từ ngày hôm sau. Không cần bù hay lo lắng.',
      },
      {
        question: '"Đường cơ sở" (baseline) trong việc theo dõi sức khỏe có ý nghĩa gì?',
        options: ['Là mức đường huyết khi bụng đói', 'Là mức sức khỏe trung bình của toàn cộng đồng', 'Là chỉ số bình thường đặc trưng của riêng cá nhân bạn khi khỏe mạnh', 'Là số ngày bạn đã dùng app'],
        correctIndex: 2,
        explanation: 'Đường cơ sở là mức chỉ số bình thường thường thấy của riêng bạn. So sánh với nó giúp bác sĩ phát hiện bất thường sớm hơn.',
      },
      {
        question: 'Vì sao không nên đợi đến khi cảm thấy thật mệt mới đo chỉ số?',
        options: ['Vì máy đo không chạy lúc đó', 'Vì khi mệt chỉ số chắc chắn sẽ sai lệch do máy lỗi', 'Vì không có dữ liệu lúc khỏe mạnh thì bác sĩ khó biết tình trạng mệt mỏi này nghiêm trọng đến mức nào', 'Vì app sẽ tự động khóa'],
        correctIndex: 2,
        explanation: 'Dữ liệu lúc mệt chỉ có giá trị cao nhất khi được so sánh với những dữ liệu đều đặn lúc bạn đang ở trạng thái khỏe mạnh.',
      },
    ],
  },

  {
    id: 'vitals_heart_rate',
    diseaseType: 'general',
    emoji: '💓',
    title: 'Nhịp tim nói lên điều gì?',
    summary: 'Hiểu ý nghĩa của nhịp tim và khi nào cần chú ý đến thay đổi nhịp tim.',
    estimatedMinutes: 3,
    level: 'basic',
    tags: ['nhịp tim', 'sinh hiệu', 'tim mạch'],
    content: [
      {
        type: 'paragraph',
        text: 'Nhịp tim (số nhịp đập mỗi phút) là chỉ số phản ánh hoạt động của tim và có thể thay đổi theo nhiều yếu tố khác nhau.',
      },
      {
        type: 'bullet',
        title: 'Nhịp tim thay đổi do:',
        items: [
          'Vận động thể chất: Tim đập nhanh hơn khi gắng sức.',
          'Cảm xúc: Lo lắng, sợ hãi làm nhịp tim tăng.',
          'Sốt: Nhiệt độ cơ thể tăng thường kéo theo nhịp tim tăng.',
          'Thuốc: Nhiều loại thuốc ảnh hưởng đến nhịp tim.',
          'Caffeine: Cà phê, trà đặc có thể làm nhịp tim tăng tạm thời.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Để kết quả dễ so sánh, nên đo nhịp tim khi nghỉ ngơi — ví dụ buổi sáng sau khi thức dậy và trước khi vận động hay uống cà phê.',
      },
      {
        type: 'note',
        text: 'Nếu nhịp tim bất thường kèm theo hồi hộp, khó thở, đau ngực, hoặc chóng mặt, hãy liên hệ bác sĩ.',
      },
      {
        type: 'paragraph',
        text: 'Nhịp tim lúc nghỉ ngơi bình thường của người trưởng thành thường dao động từ 60 đến 100 nhịp/phút. Tuy nhiên, ở những người tập luyện thể thao thường xuyên hoặc vận động viên, nhịp tim lúc nghỉ có thể thấp hơn (khoảng 40-60 nhịp/phút) và điều này thường là dấu hiệu của một trái tim khỏe mạnh.',
      },
    ],
    quiz: [
      {
        question: 'Tại sao nên đo nhịp tim khi nghỉ ngơi?',
        options: [
          'Vì đo lúc nghỉ thì máy hoạt động tốt hơn',
          'Để có kết quả ổn định và dễ so sánh theo thời gian',
          'Vì đo lúc vận động thì đau',
          'Vì bác sĩ nói vậy',
        ],
        correctIndex: 1,
        explanation: 'Nhịp tim lúc nghỉ ít bị ảnh hưởng bởi các yếu tố tạm thời, nên dễ so sánh giữa các lần đo khác nhau.',
      },
      {
        question: 'Điều gì KHÔNG làm nhịp tim thay đổi?',
        options: [
          'Vận động thể chất',
          'Màu sắc quần áo đang mặc',
          'Sốt',
          'Lo lắng, căng thẳng',
        ],
        correctIndex: 1,
        explanation: 'Màu sắc quần áo không ảnh hưởng đến nhịp tim. Trong khi đó, vận động, sốt và căng thẳng đều có thể làm nhịp tim thay đổi.',
      },
      {
        question: 'Khi nào nhịp tim bất thường cần liên hệ bác sĩ?',
        options: [
          'Khi nhịp tim tăng sau khi chạy bộ',
          'Khi nhịp tim bất thường kèm theo hồi hộp hoặc khó thở',
          'Khi uống cà phê xong tim đập hơi nhanh',
          'Khi nhịp tim khác hôm qua 2 nhịp',
        ],
        correctIndex: 1,
        explanation: 'Nhịp tim bất thường có kèm triệu chứng như hồi hộp, khó thở, đau ngực mới cần liên hệ bác sĩ khẩn.',
      },
      {
        question: 'Nhịp tim lúc nghỉ ngơi bình thường của người trưởng thành (không phải vận động viên) thường là bao nhiêu?',
        options: ['40 - 60 nhịp/phút', '60 - 100 nhịp/phút', '100 - 120 nhịp/phút', 'Dưới 40 nhịp/phút'],
        correctIndex: 1,
        explanation: 'Ở người trưởng thành bình thường, nhịp tim lúc nghỉ ngơi từ 60 đến 100 nhịp/phút được coi là an toàn và bình thường.',
      },
      {
        question: 'Đối với những người thường xuyên tập luyện thể thao cường độ cao, nhịp tim lúc nghỉ ngơi của họ thường như thế nào?',
        options: ['Cao hơn bình thường', 'Bằng chính xác 100 nhịp/phút', 'Thường thấp hơn bình thường (dưới 60 nhịp/phút)', 'Không thể đo được'],
        correctIndex: 2,
        explanation: 'Tập thể dục giúp cơ tim hoạt động hiệu quả hơn, do đó bơm máu tốt hơn với ít nhịp đập hơn. Vận động viên thường có nhịp tim nghỉ ngơi thấp.',
      },
    ],
  },

  {
    id: 'vitals_spo2',
    diseaseType: 'general',
    emoji: '🫁',
    title: 'SpO₂ là gì và cách đo đúng?',
    summary: 'Hiểu độ bão hòa oxy trong máu và cách đảm bảo kết quả đo chính xác.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['SpO2', 'oxy', 'sinh hiệu'],
    content: [
      {
        type: 'paragraph',
        text: 'SpO₂ (Saturation of Peripheral Oxygen) là chỉ số đo độ bão hòa oxy trong máu ngoại vi — nói đơn giản là bao nhiêu phần trăm hemoglobin trong máu đang vận chuyển oxy.',
      },
      {
        type: 'bullet',
        title: 'Cách đo bằng máy kẹp ngón tay (pulse oximeter):',
        items: [
          'Kẹp đầu ngón tay vào máy — thường là ngón trỏ hoặc ngón giữa.',
          'Ngồi yên, không cử động trong lúc đo.',
          'Đợi máy hiển thị kết quả ổn định (thường 10–30 giây).',
          'Đọc con số SpO₂ (%) và nhịp tim (bpm) trên màn hình.',
        ],
      },
      {
        type: 'bullet',
        title: 'Yếu tố có thể làm sai kết quả:',
        items: [
          'Tay lạnh hoặc tuần hoàn kém ở ngón tay.',
          'Sơn móng tay (đặc biệt màu đậm) che cảm biến.',
          'Cử động nhiều khi đo.',
          'Móng tay dài quá che cảm biến.',
        ],
      },
      {
        type: 'note',
        text: 'Nếu SpO₂ thấp kèm theo khó thở, da tím tái, hoặc mệt nhiều — đây là dấu hiệu cần hỗ trợ y tế ngay.',
      },
      {
        type: 'paragraph',
        text: 'Chỉ số SpO₂ bình thường ở người khỏe mạnh là từ 95% đến 100%. Nếu chỉ số này thường xuyên dưới 95% (hoặc thấp hơn ngưỡng bác sĩ của bạn đặt ra, đặc biệt đối với người có bệnh phổi mãn tính), đó có thể là dấu hiệu các cơ quan không nhận đủ oxy.',
      },
    ],
    quiz: [
      {
        question: 'SpO₂ đo điều gì?',
        options: [
          'Lượng đường trong máu',
          'Độ bão hòa oxy trong máu ngoại vi',
          'Áp lực của máu trong mạch',
          'Số lượng tế bào máu đỏ',
        ],
        correctIndex: 1,
        explanation: 'SpO₂ đo phần trăm hemoglobin đang vận chuyển oxy trong máu ngoại vi.',
      },
      {
        question: 'Điều gì có thể làm kết quả SpO₂ không chính xác?',
        options: [
          'Đo vào buổi sáng',
          'Ngón tay lạnh và sơn móng tay màu đậm',
          'Đeo nhẫn ở tay khác',
          'Uống nước trước khi đo',
        ],
        correctIndex: 1,
        explanation: 'Ngón tay lạnh làm giảm tuần hoàn và sơn móng tay che cảm biến quang học đều có thể làm sai kết quả SpO₂.',
      },
      {
        question: 'SpO₂ thấp kèm triệu chứng gì cần hỗ trợ y tế khẩn cấp?',
        options: [
          'Kèm đói bụng',
          'Kèm khó thở và da tím tái',
          'Kèm buồn ngủ sau ăn',
          'Kèm tiểu nhiều',
        ],
        correctIndex: 1,
        explanation: 'SpO₂ thấp kèm khó thở và tím tái là dấu hiệu thiếu oxy nghiêm trọng, cần gọi cấp cứu ngay.',
      },
      {
        question: 'Chỉ số SpO₂ bình thường của một người khỏe mạnh thường nằm trong khoảng nào?',
        options: ['80% - 90%', '90% - 94%', '95% - 100%', 'Trêm 100%'],
        correctIndex: 2,
        explanation: 'Mức SpO₂ từ 95% đến 100% là mức bình thường cho hầu hết mọi người không có bệnh nền về hô hấp.',
      },
      {
        question: 'Vì sao sơn móng tay màu đậm lại làm kết quả đo SpO₂ bị sai lệch?',
        options: ['Vì sơn móng tay làm lạnh ngón tay', 'Vì sơn móng tay ngăn cản tia sáng hồng ngoại của máy đo xuyên qua móng tay', 'Vì sơn móng tay làm nhịp tim đập nhanh hơn', 'Vì máy đo bị dị ứng với sơn'],
        correctIndex: 1,
        explanation: 'Máy đo SpO₂ hoạt động dựa trên việc phát tia sáng qua đầu ngón tay. Lớp sơn móng tay dày hoặc màu đậm sẽ cản trở tia sáng này, gây sai số.',
      },
    ],
  },

  {
    id: 'vitals_temp_respiration',
    diseaseType: 'general',
    emoji: '🌡️',
    title: 'Nhiệt độ và nhịp thở: khi nào cần chú ý?',
    summary: 'Hiểu ý nghĩa của nhiệt độ và nhịp thở trong theo dõi sức khỏe.',
    estimatedMinutes: 3,
    level: 'basic',
    tags: ['nhiệt độ', 'nhịp thở', 'sinh hiệu'],
    content: [
      {
        type: 'paragraph',
        text: 'Nhiệt độ cơ thể và nhịp thở là hai chỉ số đơn giản nhưng cung cấp thông tin quan trọng về tình trạng sức khỏe tổng thể.',
      },
      {
        type: 'bullet',
        title: 'Nhiệt độ:',
        items: [
          'Sốt có thể làm nhịp tim tăng và cơ thể mệt mỏi hơn.',
          'Ghi nhiệt độ vào app cùng triệu chứng kèm theo nếu có.',
          'Sốt cao kéo dài, sốt kèm khó thở, hoặc sốt không rõ nguyên nhân cần liên hệ bác sĩ.',
        ],
      },
      {
        type: 'bullet',
        title: 'Nhịp thở:',
        items: [
          'Nhịp thở tăng có thể do vận động, lo lắng, sốt, hoặc vấn đề hô hấp.',
          'Khi nhập liệu, nên ghi trong trạng thái nghỉ ngơi để kết quả có ý nghĩa.',
          'Ghi chú triệu chứng kèm theo như ho, khó thở, đau ngực nếu có.',
        ],
      },
      {
        type: 'note',
        text: 'Nếu có khó thở đột ngột, tím tái môi/đầu ngón tay, hoặc lơ mơ — cần hỗ trợ y tế ngay, không chờ đợi.',
      },
      {
        type: 'paragraph',
        text: 'Nhịp thở bình thường ở người trưởng thành lúc nghỉ ngơi thường từ 12 đến 20 lần/phút. Việc đếm nhịp thở nên được thực hiện tự nhiên, tránh để người bệnh chú ý quá mức vì họ có thể tự điều chỉnh nhịp thở (thở nhanh hoặc chậm hơn bình thường một cách vô thức).',
      },
    ],
    quiz: [
      {
        question: 'Sốt có thể ảnh hưởng đến chỉ số nào khác không?',
        options: [
          'Không ảnh hưởng chỉ số nào khác',
          'Có thể làm nhịp tim tăng',
          'Làm SpO₂ tăng',
          'Làm đường huyết giảm',
        ],
        correctIndex: 1,
        explanation: 'Sốt thường làm nhịp tim tăng do cơ thể cần bơm máu nhiều hơn để điều hòa nhiệt độ.',
      },
      {
        question: 'Nên đo nhịp thở trong trạng thái nào để có ý nghĩa nhất?',
        options: [
          'Sau khi chạy bộ',
          'Trong trạng thái nghỉ ngơi',
          'Ngay sau khi tức giận',
          'Trong khi nói chuyện',
        ],
        correctIndex: 1,
        explanation: 'Nhịp thở lúc nghỉ ngơi cho kết quả ổn định và dễ so sánh theo thời gian hơn.',
      },
      {
        question: 'Triệu chứng nào cần hỗ trợ y tế NGAY không chờ đợi?',
        options: [
          'Sốt nhẹ 37,5°C',
          'Khó thở đột ngột kèm tím tái',
          'Nhịp thở tăng sau khi leo cầu thang',
          'Ho khan nhẹ',
        ],
        correctIndex: 1,
        explanation: 'Khó thở đột ngột kèm tím tái là dấu hiệu nguy hiểm cần gọi cấp cứu ngay.',
      },
      {
        question: 'Nhịp thở lúc nghỉ ngơi của người trưởng thành khỏe mạnh bình thường là bao nhiêu?',
        options: ['Dưới 10 lần/phút', '12 đến 20 lần/phút', '25 đến 30 lần/phút', 'Trên 30 lần/phút'],
        correctIndex: 1,
        explanation: 'Ở trạng thái nghỉ ngơi, một người trưởng thành khỏe mạnh thở khoảng 12 đến 20 nhịp mỗi phút.',
      },
      {
        question: 'Tại sao khi đếm nhịp thở, bạn không nên nói cho người bệnh biết bạn đang đếm?',
        options: ['Vì đó là bí mật y tế', 'Vì người bệnh sẽ tự động thay đổi nhịp thở của mình một cách vô thức khi biết mình bị theo dõi', 'Vì nói chuyện sẽ làm tăng huyết áp', 'Vì đếm thầm sẽ chính xác hơn'],
        correctIndex: 1,
        explanation: 'Hô hấp là hoạt động có thể điều khiển được một phần bằng ý thức. Khi biết đang bị đếm nhịp thở, người bệnh thường có xu hướng thở không tự nhiên.',
      },
    ],
  },

  // ===== NHÓM D — DÙNG APP ĐÚNG CÁCH =====
  {
    id: 'app_input_correctly',
    diseaseType: 'general',
    emoji: '📱',
    title: 'Cách nhập bản đo chính xác vào app',
    summary: 'Đảm bảo dữ liệu bạn nhập có chất lượng tốt để bác sĩ theo dõi hiệu quả.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['dùng app', 'nhập liệu', 'kỹ thuật'],
    content: [
      {
        type: 'paragraph',
        text: 'Chất lượng dữ liệu bạn nhập vào app ảnh hưởng trực tiếp đến khả năng bác sĩ theo dõi và hỗ trợ bạn. Một vài bước đơn giản giúp dữ liệu chính xác hơn.',
      },
      {
        type: 'bullet',
        title: 'Trước khi gửi kết quả đo:',
        items: [
          'Kiểm tra lại con số trên máy đo trước khi nhập — tránh nhầm số.',
          'Nhập đúng đơn vị: Huyết áp (mmHg), Đường huyết (mg/dL theo hướng dẫn), Nhiệt độ (°C).',
          'Chọn đúng thời điểm: Trước ăn hay Sau ăn nếu đo đường huyết.',
          'Ghi lại thời gian đo nếu app yêu cầu.',
        ],
      },
      {
        type: 'bullet',
        title: 'Thêm ghi chú khi cần:',
        items: [
          'Vừa ăn xong bữa lớn hoặc bữa ăn bất thường.',
          'Vừa vận động nhiều trước khi đo.',
          'Quên uống thuốc hoặc uống muộn hơn bình thường.',
          'Đang bị sốt, mệt, hoặc có triệu chứng gì đó.',
        ],
      },
      {
        type: 'note',
        text: 'Ghi chú ngắn trong app tiết kiệm thời gian giải thích khi gặp bác sĩ và giúp bác sĩ hiểu bối cảnh kết quả của bạn.',
      },
      {
        type: 'paragraph',
        text: 'Đừng quên duy trì việc nhập liệu ngay cả vào những ngày cuối tuần hoặc ngày lễ. Rất nhiều trường hợp bất thường xảy ra vào thời điểm sinh hoạt bị thay đổi (như các kỳ nghỉ) nhưng lại thiếu dữ liệu để bác sĩ kịp thời can thiệp.',
      },
    ],
    quiz: [
      {
        question: 'Việc ghi chú trong app khi nhập liệu có lợi ích gì?',
        options: [
          'Chỉ để app đẹp hơn',
          'Giúp bác sĩ hiểu bối cảnh kết quả và không cần giải thích nhiều khi gặp mặt',
          'Bắt buộc phải điền',
          'Không có lợi ích gì',
        ],
        correctIndex: 1,
        explanation: 'Ghi chú giúp bác sĩ hiểu tại sao kết quả hôm đó khác biệt và đánh giá chính xác hơn.',
      },
      {
        question: 'Điều quan trọng nhất khi nhập số đo vào app là gì?',
        options: [
          'Nhập thật nhanh',
          'Kiểm tra lại số trước khi gửi và đảm bảo đúng đơn vị',
          'Nhập ngay sau khi ngủ dậy',
          'Nhập bất kỳ lúc nào trong ngày',
        ],
        correctIndex: 1,
        explanation: 'Số sai hoặc sai đơn vị có thể làm bác sĩ đánh giá nhầm. Kiểm tra kỹ trước khi gửi là bước quan trọng.',
      },
      {
        question: 'Khi nào nên thêm ghi chú vào bản đo?',
        options: [
          'Chỉ khi kết quả bất thường',
          'Khi có yếu tố bất thường như quên thuốc, vừa vận động, hoặc đang bệnh',
          'Không bao giờ cần thiết',
          'Chỉ khi bác sĩ yêu cầu',
        ],
        correctIndex: 1,
        explanation: 'Ghi chú khi có bối cảnh đặc biệt giúp bác sĩ hiểu tại sao kết quả khác với thường lệ.',
      },
      {
        question: 'Việc ghi chú "Sau ăn" hoặc "Trước ăn" đối với đường huyết ảnh hưởng như thế nào đến quyết định của bác sĩ?',
        options: ['Chỉ để bác sĩ biết bạn ăn món gì', 'Giúp bác sĩ phân biệt và đánh giá đúng tình trạng chuyển hóa của cơ thể theo các tiêu chuẩn khác nhau', 'Không ảnh hưởng gì', 'Làm bác sĩ bối rối'],
        correctIndex: 1,
        explanation: 'Ngưỡng đánh giá trước ăn và sau ăn hoàn toàn khác nhau, do đó việc ghi chú sai thời điểm có thể dẫn đến việc điều chỉnh sai liều thuốc.',
      },
      {
        question: 'Tại sao cần duy trì nhập liệu vào ngày nghỉ, ngày lễ?',
        options: ['Vì app không cho nghỉ', 'Để tích điểm thưởng', 'Vì sinh hoạt vào ngày nghỉ thường thay đổi, làm tăng nguy cơ biến động chỉ số, cần được theo dõi sát', 'Để bác sĩ luôn bận rộn'],
        correctIndex: 2,
        explanation: 'Các thay đổi về ăn uống, ngủ nghỉ trong những ngày lễ dễ làm chỉ số biến động, do đó việc theo dõi không nên bị gián đoạn.',
      },
    ],
  },

  {
    id: 'app_understand_alerts',
    diseaseType: 'general',
    emoji: '🔔',
    title: 'Hiểu cảnh báo trong app',
    summary: 'Biết cách đọc và phản ứng đúng với cảnh báo sức khỏe từ hệ thống.',
    estimatedMinutes: 3,
    level: 'basic',
    tags: ['dùng app', 'cảnh báo', 'hiểu kết quả'],
    content: [
      {
        type: 'paragraph',
        text: 'App sẽ tạo cảnh báo khi chỉ số đo vượt qua ngưỡng theo dõi mà bác sĩ đã thiết lập cho bạn. Điều này giúp bác sĩ chú ý đến bạn sớm hơn.',
      },
      {
        type: 'bullet',
        title: 'Khi nhận cảnh báo từ app:',
        items: [
          'Đọc kỹ cảnh báo — chỉ số nào vượt ngưỡng và bao nhiêu.',
          'Kiểm tra xem có đo đúng cách không (tư thế, thời điểm, thiết bị).',
          'Nếu nghĩ có thể sai, đo lại và nhập kết quả mới.',
          'Nếu kết quả vẫn bất thường, liên hệ bác sĩ qua tính năng nhắn tin.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Cảnh báo trong app không phải là chẩn đoán bệnh. Đây chỉ là tín hiệu để bạn và bác sĩ chú ý thêm.',
      },
      {
        type: 'note',
        text: 'Nếu cảm thấy không khỏe dù app không có cảnh báo, hãy liên hệ bác sĩ. Cơ thể bạn quan trọng hơn con số.',
      },
      {
        type: 'paragraph',
        text: 'Hãy nhớ rằng, đôi khi thiết bị đo có thể gặp trục trặc như hết pin, lỗi cảm biến hoặc lỏng vòng bít. Trước khi hốt hoảng vì một cảnh báo rất cao, hãy kiểm tra thiết bị, nghỉ ngơi 5 phút và đo lại lần thứ hai một cách cẩn thận để xác nhận.',
      },
    ],
    quiz: [
      {
        question: 'Cảnh báo trong app có nghĩa là gì?',
        options: [
          'Bạn đang bị bệnh nặng',
          'Chỉ số vượt ngưỡng theo dõi cá nhân — cần chú ý thêm',
          'Bạn cần nhập viện ngay',
          'App bị lỗi',
        ],
        correctIndex: 1,
        explanation: 'Cảnh báo chỉ báo hiệu chỉ số vượt ngưỡng cá nhân, không phải là chẩn đoán bệnh.',
      },
      {
        question: 'Nếu cảnh báo xuất hiện, bước đầu tiên nên làm là gì?',
        options: [
          'Gọi cấp cứu ngay',
          'Kiểm tra lại kết quả đo có đúng không',
          'Bỏ qua vì app hay sai',
          'Uống thêm thuốc',
        ],
        correctIndex: 1,
        explanation: 'Trước tiên hãy xem lại cách đo có đúng không. Đôi khi kết quả bất thường do đo sai cách.',
      },
      {
        question: 'Nếu cảm thấy không khỏe nhưng app không có cảnh báo, bạn nên làm gì?',
        options: [
          'Không làm gì vì app nói bình thường',
          'Liên hệ bác sĩ vì cơ thể quan trọng hơn con số',
          'Chờ đến khi app cảnh báo',
          'Tự điều trị ở nhà',
        ],
        correctIndex: 1,
        explanation: 'App hỗ trợ theo dõi nhưng không thể thay thế cảm nhận của bạn. Nếu không khỏe, hãy liên hệ bác sĩ.',
      },
      {
        question: 'Nếu máy báo kết quả cực kỳ cao hoặc thấp nhưng bạn thấy hoàn toàn bình thường, bước tiếp theo tốt nhất là gì?',
        options: ['Báo ngay cho bác sĩ hoặc gọi cấp cứu', 'Uống thuốc ngay lập tức', 'Kiểm tra lại máy, nghỉ ngơi 5 phút rồi tiến hành đo lại cẩn thận', 'Đập bỏ máy đo'],
        correctIndex: 2,
        explanation: 'Rất có thể đó là lỗi của thiết bị (hết pin, đeo sai cách). Việc đo lại giúp loại trừ sai số trước khi đưa ra quyết định.',
      },
      {
        question: 'Một cảnh báo trên app là chẩn đoán y tế cuối cùng?',
        options: ['Đúng, app có thể thay thế bác sĩ', 'Sai, cảnh báo chỉ là tín hiệu nhắc nhở để bạn và bác sĩ chú ý theo dõi thêm', 'Đúng, cảnh báo luôn luôn chuẩn xác 100%', 'Sai, cảnh báo không có ý nghĩa gì cả'],
        correctIndex: 1,
        explanation: 'Chỉ có bác sĩ mới có thể đưa ra chẩn đoán và phác đồ điều trị sau khi đánh giá tổng thể tình trạng của bạn.',
      },
    ],
  },

  // ===== NHÓM E — LỐI SỐNG VÀ TUÂN THỦ =====
  {
    id: 'lifestyle_sustainable_habit',
    diseaseType: 'lifestyle',
    emoji: '🌱',
    title: 'Tạo thói quen theo dõi sức khỏe bền vững',
    summary: 'Mẹo đơn giản giúp duy trì thói quen đo và ghi chép sức khỏe lâu dài.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['lối sống', 'thói quen', 'theo dõi'],
    content: [
      {
        type: 'paragraph',
        text: 'Theo dõi sức khỏe lâu dài không phải là làm thật hoàn hảo mỗi ngày — quan trọng hơn là duy trì đủ đều để có dữ liệu có ý nghĩa.',
      },
      {
        type: 'bullet',
        title: 'Mẹo tạo thói quen bền vững:',
        items: [
          'Chọn một khung giờ cố định hằng ngày — ví dụ ngay sau khi thức dậy buổi sáng.',
          'Đặt thiết bị đo (máy huyết áp, máy đo đường huyết) ở chỗ dễ thấy — trên bàn ngủ hoặc góc bếp.',
          'Sau khi đo xong, mở app và nhập ngay — đừng để sang hôm sau.',
          'Nếu quên một ngày thì không sao — tiếp tục ngày hôm sau, không cần bù.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Ghi chú ngắn thay vì để trống. Dù chỉ một từ như "Bình thường", "Sau ăn xôi" hay "Mệt nhẹ" cũng hữu ích hơn là để trống.',
      },
      {
        type: 'note',
        text: 'Theo dõi đều đặn 70–80% số ngày trong tháng đã cho kết quả hữu ích. Không cần 100% mới có giá trị.',
      },
      {
        type: 'paragraph',
        text: 'Để duy trì động lực, hãy chia sẻ kết quả với gia đình hoặc một người bạn đồng hành. Việc có người khích lệ và nhắc nhở thường xuyên sẽ làm giảm cảm giác cô đơn trong hành trình quản lý bệnh mãn tính.',
      },
    ],
    quiz: [
      {
        question: 'Thời điểm nào tốt nhất để tạo thói quen đo sức khỏe hằng ngày?',
        options: [
          'Bất kỳ lúc nào cũng được',
          'Một khung giờ cố định, ví dụ ngay sau khi thức dậy',
          'Chỉ khi nhớ ra',
          'Chỉ khi cảm thấy mệt',
        ],
        correctIndex: 1,
        explanation: 'Chọn một khung giờ cố định giúp hành động trở thành thói quen tự động và dễ duy trì hơn.',
      },
      {
        question: 'Nếu quên đo một ngày, bạn nên làm gì?',
        options: [
          'Nhập dữ liệu giả để đủ ngày',
          'Tiếp tục từ ngày hôm sau, không cần lo lắng',
          'Đo bù 2 lần ngày hôm sau',
          'Báo cáo với bác sĩ về ngày bỏ lỡ',
        ],
        correctIndex: 1,
        explanation: 'Bỏ sót một ngày là bình thường. Quan trọng là tiếp tục theo dõi đều đặn về sau.',
      },
      {
        question: 'Dữ liệu đo đạt bao nhiêu phần trăm số ngày trong tháng đã đủ hữu ích?',
        options: ['100% mới có giá trị', '70–80% đã cho kết quả hữu ích', 'Cần ít nhất 95%', 'Chỉ cần vài ngày mỗi tháng'],
        correctIndex: 1,
        explanation: 'Theo dõi đều đặn 70–80% số ngày đã cung cấp đủ dữ liệu để bác sĩ theo dõi xu hướng.',
      },
      {
        question: 'Tại sao việc đặt máy đo ở nơi dễ thấy (như bàn ngủ hoặc góc bếp) lại quan trọng?',
        options: ['Để khoe với khách đến nhà', 'Nhằm mục đích trang trí', 'Nó đóng vai trò như một lời nhắc nhở trực quan (visual cue) giúp bạn không quên việc đo mỗi ngày', 'Để tránh máy bị hỏng'],
        correctIndex: 2,
        explanation: 'Môi trường có ảnh hưởng lớn đến thói quen. Việc nhìn thấy máy đo thường xuyên sẽ tự động nhắc nhở não bộ thực hiện hành động đo lường.',
      },
      {
        question: 'Ai có thể giúp bạn duy trì thói quen theo dõi sức khỏe tốt hơn?',
        options: ['Người lạ trên mạng', 'Chỉ duy nhất bác sĩ', 'Một người thân trong gia đình hoặc bạn đồng hành (để khích lệ, nhắc nhở)', 'Không ai cả'],
        correctIndex: 2,
        explanation: 'Sự hỗ trợ từ người thân không chỉ giúp nhắc nhở về mặt thời gian mà còn cung cấp động lực tinh thần rất lớn để duy trì thói quen.',
      },
    ],
  },

  {
    id: 'medication_adherence',
    diseaseType: 'medication',
    emoji: '💊',
    title: 'Dùng thuốc đúng hướng dẫn',
    summary: 'Hiểu tầm quan trọng của việc tuân thủ sử dụng thuốc theo chỉ định.',
    estimatedMinutes: 4,
    level: 'basic',
    tags: ['thuốc', 'tuân thủ điều trị', 'lối sống'],
    content: [
      {
        type: 'paragraph',
        text: 'Thuốc chỉ phát huy hiệu quả khi được dùng đúng cách, đúng liều và đúng thời gian. Đây là một trong những yếu tố quan trọng nhất trong việc kiểm soát bệnh mãn tính.',
      },
      {
        type: 'bullet',
        title: 'Nguyên tắc dùng thuốc an toàn:',
        items: [
          'Uống thuốc theo đúng hướng dẫn của bác sĩ — liều lượng, thời điểm trong ngày, trước hay sau ăn.',
          'Không tự ý ngưng thuốc dù cảm thấy chỉ số đã tốt hơn.',
          'Không tự tăng hoặc giảm liều mà không được bác sĩ đồng ý.',
          'Không dùng thuốc của người khác dù có bệnh giống nhau.',
        ],
      },
      {
        type: 'bullet',
        title: 'Khi gặp vấn đề với thuốc:',
        items: [
          'Nếu quên một liều — hỏi bác sĩ hoặc dược sĩ về cách xử lý phù hợp.',
          'Nếu có tác dụng phụ — liên hệ bác sĩ để thảo luận, không tự ý dừng.',
          'Nếu khó mua thuốc hoặc có vấn đề tài chính — nói chuyện với nhân viên y tế, có thể có giải pháp hỗ trợ.',
        ],
      },
      {
        type: 'paragraph',
        text: 'App có thể có tính năng nhắc nhở uống thuốc. Hãy dùng tính năng này để không bỏ sót liều, đặc biệt nếu bạn có nhiều loại thuốc.',
      },
      {
        type: 'note',
        text: 'Nếu thường xuyên quên thuốc, hãy chia sẻ với bác sĩ để cùng tìm cách giải quyết — không cần ngại ngùng.',
      },
      {
        type: 'paragraph',
        text: 'Một số loại thuốc có tương tác với thức ăn (như bưởi chùm có thể làm tăng độc tính của thuốc hạ huyết áp mỡ máu). Luôn hỏi bác sĩ hoặc đọc kỹ tờ hướng dẫn sử dụng về các loại thực phẩm hoặc đồ uống cần tránh khi uống loại thuốc đó.',
      },
    ],
    quiz: [
      {
        question: 'Bạn có thể tự ngưng thuốc khi thấy sức khỏe đã tốt hơn không?',
        options: [
          'Có, vì không cần thuốc nữa',
          'Không, cần hỏi bác sĩ trước',
          'Có, nhưng giảm liều từ từ',
          'Có thể ngưng vào cuối tuần',
        ],
        correctIndex: 1,
        explanation: 'Tình trạng tốt hơn thường là do thuốc đang phát huy tác dụng. Tự ngưng có thể làm bệnh tái phát và khó kiểm soát hơn.',
      },
      {
        question: 'Nếu gặp tác dụng phụ từ thuốc, bạn nên làm gì?',
        options: [
          'Ngừng thuốc ngay',
          'Tăng liều để thuốc mạnh hơn',
          'Liên hệ bác sĩ để thảo luận',
          'Uống thêm thuốc khác để chống tác dụng phụ',
        ],
        correctIndex: 2,
        explanation: 'Bác sĩ cần biết tác dụng phụ để điều chỉnh hoặc thay thế thuốc phù hợp. Không tự ngưng hay tự xử lý.',
      },
      {
        question: 'App nhắc nhở uống thuốc giúp ích như thế nào?',
        options: [
          'Không giúp ích gì',
          'Giúp không bỏ sót liều, đặc biệt khi có nhiều loại thuốc',
          'Chỉ dành cho người cao tuổi',
          'Làm tăng liều thuốc tự động',
        ],
        correctIndex: 1,
        explanation: 'Nhắc nhở uống thuốc trong app giúp bạn không bỏ sót liều, từ đó tăng hiệu quả điều trị.',
      },
      {
        question: 'Nếu bạn có một chuyến đi xa và quên mang theo thuốc huyết áp, bạn nên làm gì?',
        options: ['Không uống thuốc vài ngày cũng không sao', 'Mượn thuốc của người thân đi cùng nếu họ cũng uống thuốc huyết áp', 'Đến nhà thuốc hoặc cơ sở y tế gần nhất để xin tư vấn và mua đúng loại thuốc/hoạt chất mình đang dùng', 'Uống trà thảo mộc thay thế'],
        correctIndex: 2,
        explanation: 'Tuyệt đối không dùng thuốc của người khác vì mỗi người có chỉ định liều lượng và loại thuốc riêng. Cần mua đúng thuốc hoặc hỏi ý kiến dược sĩ/bác sĩ.',
      },
      {
        question: 'Thức ăn và đồ uống (như nước ép bưởi) có thể ảnh hưởng đến thuốc như thế nào?',
        options: ['Luôn làm thuốc mất tác dụng', 'Có thể gây tương tác, làm thay đổi khả năng hấp thu hoặc làm tăng tác dụng phụ của một số loại thuốc', 'Giúp thuốc hấp thu tốt hơn gấp đôi', 'Không có bất kỳ ảnh hưởng nào'],
        correctIndex: 1,
        explanation: 'Nhiều loại thuốc có tương tác mạnh với thực phẩm, do đó luôn phải tuân thủ hướng dẫn uống lúc no/đói và tránh các thực phẩm cấm kỵ.',
      },
    ],
  },
];

// Helper để lấy bài theo diseaseType
export function getArticlesByDiseaseType(type) {
  return educationArticles.filter((a) => a.diseaseType === type);
}

// Helper để lấy bài gợi ý theo profile bệnh nhân
export function getRecommendedArticles(diseaseTypes) {
  if (!diseaseTypes) {
    return educationArticles.filter(
      (a) => a.diseaseType === 'general' || a.diseaseType === 'lifestyle'
    );
  }

  const recommended = [];
  const seen = new Set();

  if (diseaseTypes.bloodPressure) {
    educationArticles
      .filter((a) => a.diseaseType === 'bloodPressure')
      .forEach((a) => { if (!seen.has(a.id)) { recommended.push(a); seen.add(a.id); } });
  }
  if (diseaseTypes.glucose) {
    educationArticles
      .filter((a) => a.diseaseType === 'glucose')
      .forEach((a) => { if (!seen.has(a.id)) { recommended.push(a); seen.add(a.id); } });
  }

  // Thêm bài general nếu không có diseaseType nào khớp
  if (recommended.length === 0) {
    educationArticles
      .filter((a) => a.diseaseType === 'general' || a.diseaseType === 'lifestyle')
      .forEach((a) => { if (!seen.has(a.id)) { recommended.push(a); seen.add(a.id); } });
  }

  return recommended;
}

export const FILTER_LABELS = {
  all: 'Tất cả',
  recommended: 'Dành cho bạn',
  bloodPressure: 'Huyết áp',
  glucose: 'Tiểu đường',
  general: 'Sinh tồn',
  app: 'Dùng app',
  lifestyle: 'Lối sống',
};
