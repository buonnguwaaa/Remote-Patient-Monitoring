import { useNavigate } from "react-router-dom";
import { useState } from "react";

import Table, { type Column } from "../../components/ui/Table";

import { Chat, Edit } from "./ActionButton";

interface PatientItem {
  id: number;
  name: string;
  updatedAt?: string;

  status: "Bình thường" | "Cảnh báo";
}

// mock data
const patients: PatientItem[] = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    updatedAt: "2024-04-01",

    status: "Bình thường",
  },
  {
    id: 2,
    name: "Trần Thị B",
    updatedAt: "2024-04-02",

    status: "Cảnh báo",
  },
  {
    id: 3,
    name: "Lê Văn C",
    updatedAt: "2024-04-03",

    status: "Bình thường",
  },
  {
    id: 4,
    name: "Phạm Thị D",
    updatedAt: "2024-04-04",

    status: "Bình thường",
  },
  {
    id: 5,
    name: "Hoàng Văn E",
    updatedAt: "2024-04-05",

    status: "Cảnh báo",
  },
  {
    id: 6,
    name: "Vũ Thị F",
    updatedAt: "2024-04-06",
    status: "Bình thường",
  },
  {
    id: 7,
    name: "Đặng Thị G",
    updatedAt: "2024-04-07",
    status: "Cảnh báo",
  },
];

const PatientList = () => {
  const columns: Column<PatientItem>[] = [
    {
      header: "ID",
      accessor: "id",
      className: "w-10 font-bold",
    },
    {
      header: "Họ và Tên",
      accessor: "name",
      className: "font-medium text-gray-900",
    },
    {
      header: "Ngày cập nhật",
      accessor: "updatedAt",
    },
    {
      header: "Tình trạng",
      // Sử dụng render để custom giao diện (Badge)
      render: (user) => (
        <div
          className={`px-2 py-1 rounded-full w-fit text-xs font-semibold ${user.status === "Bình thường"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
            }`}
        >
          <span>{user.status}</span>
        </div>
      ),
    },
    {
      header: "Hành động",
      // Cột này không có accessor, chỉ có nút bấm
      render: (user) => (
        <div className="flex gap-3">
          <Chat
            className=" cursor-pointer p-1 hover:bg-gray-200 rounded-md"
            iconSize={22}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patient/chat/${user.id}`);
            }}
          />
          {/* <View
            className=" cursor-pointer p-1 hover:bg-gray-200 rounded-md"
            iconSize={20}
            onClick={() => console.log("View clicked for", user.name)}
          /> */}
          <Edit
            className=" cursor-pointer p-1 hover:bg-gray-200 rounded-md"
            iconSize={20}
            onClick={() => console.log("Edit clicked for", user.name)}
          />
        </div>
      ),
    },
  ];

  const clickedRow = (patient: PatientItem) => {
    // Chuyển hướng đến trang chi tiết bệnh nhân
    //navigate(`/patient/${patient.id}`);
    navigate(`/patient/1`);
  };
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Danh sách bệnh nhân</h1>
      {/* {Section Filter & Search} */}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* {Theo ngày} */}

          <div className=" w-39">
            <input
              type="date"
              placeholder="Chọn ngày cập nhật"
              className="w-full border-2 border-gray-400 rounded-lg p-2.5 outline-none bg-white text-gray-700 hover:border-red-500 focus:border-blue-500 transition-colors"
              onChange={(e) => {
                const date = e.target.value;
                console.log(date);
              }}
            />
          </div>

          {/* { Theo trạng thái normal/warn } */}
          <div className=" w-39">
            {/* {Status Filter} */}
            <select
              className="border-2 border-gray-400 rounded-md p-2 outline:-none bg-white"
              onChange={(e) => {
                const status = e.target.value;
                console.log("Filter by status:", status);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Bình thường">Bình thường</option>
              <option value="Cảnh báo">Cảnh báo</option>
            </select>
          </div>
        </div>
        {/* {Search} */}
        <div>
          {/* {Search} */}
          <input
            type="text"
            placeholder="Tìm kiếm bệnh nhân..."
            className="border-2 border-gray-400 rounded-md p-2 outline-none"
            onChange={(e) => {
              const query = e.target.value;
              console.log("Search query:", query);
            }}
          />
        </div>
      </div>
      <Table data={patients} columns={columns} onRowClick={clickedRow} itemsPerPage={8} />
      {/* {selectedPatient && (
        <PatientProfile patient={selectedPatient} />
      )} */}
    </div>
  );
};

export default PatientList;
