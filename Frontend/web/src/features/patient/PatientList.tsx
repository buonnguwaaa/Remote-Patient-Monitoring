import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

import Table, { type Column } from "../../components/ui/Table";
import { Chat, Edit } from "./ActionButton";
import { getMyPatients, getLatestAlertForPatient } from "../../services/patientService";
import type { PatientItem } from "../../types/patient";

const PatientList = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);

        const assignments = await getMyPatients();

        const patientItems: PatientItem[] = await Promise.all(
          assignments.map(async (assignment) => {
            let status: PatientItem["status"] = "Bình thường";

            try {
              const latestAlert = await getLatestAlertForPatient(assignment.patientId);
              if (latestAlert && latestAlert.severity === "high" && latestAlert.status === "open") {
                status = "Cảnh báo";
              }
            } catch {
          
            }

            return {
              id: assignment.patientId,
              name: assignment.patientName || "Không rõ tên",
              updatedAt: assignment.updatedAt
                ? new Date(assignment.updatedAt).toISOString().split("T")[0]
                : undefined,
              status,
            };
          })
        );

        setPatients(patientItems);
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || "Không thể tải danh sách bệnh nhân");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (filterDate && p.updatedAt !== filterDate) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [patients, filterDate, filterStatus, searchQuery]);

  const columns: Column<PatientItem>[] = [
    {
      header: "STT",
      render: (user) => (
        <span className="font-bold">
          {filteredPatients.indexOf(user) + 1}
        </span>
      ),
      className: "w-10",
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
    navigate(`/patient/${patient.id}`);
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
          <p className="mt-2 text-sm text-gray-600">Đang tải danh sách bệnh nhân...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-semibold">Lỗi</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Danh sách bệnh nhân</h1>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className=" w-39">
            <input
              type="date"
              placeholder="Chọn ngày cập nhật"
              className="w-full border-2 border-gray-400 rounded-lg p-2.5 outline-none bg-white text-gray-700 hover:border-red-500 focus:border-blue-500 transition-colors"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div className=" w-39">
            <select
              className="border-2 border-gray-400 rounded-md p-2 outline-none bg-white"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Bình thường">Bình thường</option>
              <option value="Cảnh báo">Cảnh báo</option>
            </select>
          </div>
        </div>

        <div>
          <input
            type="text"
            placeholder="Tìm kiếm bệnh nhân..."
            className="border-2 border-gray-400 rounded-md p-2 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Table data={filteredPatients} columns={columns} onRowClick={clickedRow} itemsPerPage={8} />
    </div>
  );
};

export default PatientList;
