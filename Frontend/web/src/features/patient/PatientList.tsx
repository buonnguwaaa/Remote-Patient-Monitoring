import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Table, { type Column } from "../../components/ui/Table";
import { getAlerts, getMyPatients } from "../../services/patientService";
import type { PatientItem } from "../../types/patient";
import { Chat, Edit } from "./ActionButton";

const PatientList = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);

        const [assignments, alerts] = await Promise.all([getMyPatients(), getAlerts()]);

        const latestAlertByPatient = new Map<string, (typeof alerts)[number]>();
        const sortedAlerts = [...alerts].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        sortedAlerts.forEach((alert) => {
          if (!latestAlertByPatient.has(alert.patientId)) {
            latestAlertByPatient.set(alert.patientId, alert);
          }
        });

        const patientItems: PatientItem[] = assignments.map((assignment) => {
          let status: PatientItem["status"] = "Bình thường";

          const latestAlert = latestAlertByPatient.get(assignment.patientId);
          if (latestAlert && latestAlert.severity === "high" && latestAlert.status === "open") {
            status = "Cảnh báo";
          }

          return {
            id: assignment.patientId,
            name: assignment.patientName || "Không rõ tên",
            patientCode: assignment.patientCode || "Chưa có mã",
            updatedAt: assignment.updatedAt
              ? new Date(assignment.updatedAt).toISOString().split("T")[0]
              : undefined,
            status,
          };
        });

        setPatients(patientItems);
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || "Không thể tải danh sách bệnh nhân");
      } finally {
        setLoading(false);
      }
    };

    void fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return patients.filter((patient) => {
      if (filterDate && patient.updatedAt !== filterDate) return false;
      if (filterStatus && patient.status !== filterStatus) return false;

      if (
        normalizedQuery &&
        !patient.name.toLowerCase().includes(normalizedQuery) &&
        !patient.patientCode?.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }

      return true;
    });
  }, [patients, filterDate, filterStatus, searchQuery]);

  const columns: Column<PatientItem>[] = [
    {
      header: "STT",
      render: (patient) => <span className="font-bold">{filteredPatients.indexOf(patient) + 1}</span>,
      className: "w-10",
    },
    {
      header: "Mã hồ sơ",
      accessor: "patientCode",
      className: "font-medium text-gray-700 dark:text-slate-300",
    },
    {
      header: "Họ và tên",
      accessor: "name",
      className: "font-medium text-gray-900 dark:text-slate-100",
    },
    {
      header: "Ngày cập nhật",
      accessor: "updatedAt",
    },
    {
      header: "Tình trạng",
      render: (patient) => (
        <div
          className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
            patient.status === "Bình thường"
              ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400"
              : "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400"
          }`}
        >
          <span>{patient.status}</span>
        </div>
      ),
    },
    {
      header: "Hành động",
      render: (patient) => (
        <div className="flex gap-3">
          <Chat
            className="cursor-pointer rounded-md p-1 hover:bg-gray-200 dark:hover:bg-slate-700"
            iconSize={22}
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/patient/chat/${patient.id}`);
            }}
          />
          <Edit
            className="cursor-pointer rounded-md p-1 hover:bg-gray-200 dark:hover:bg-slate-700"
            iconSize={20}
            onClick={() => console.log("Edit clicked for", patient.name)}
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
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-slate-900 p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">Đang tải danh sách bệnh nhân...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-900 p-8">
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4 text-red-700 dark:text-red-400">
          <p className="font-semibold">Lỗi</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 p-8">
      <h1 className="mb-4 text-3xl font-bold text-gray-800 dark:text-slate-100">Danh sách bệnh nhân</h1>

      <div className="mb-4 flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <div className="w-39">
            <input
              type="date"
              placeholder="Chọn ngày cập nhật"
              className="w-full rounded-lg border-2 border-gray-400 dark:border-slate-600 bg-white dark:bg-slate-800 p-2.5 text-gray-700 dark:text-slate-200 outline-none transition-colors hover:border-red-500 focus:border-blue-500"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
            />
          </div>

          <div className="w-39">
            <select
              className="rounded-md border-2 border-gray-400 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 p-2 outline-none"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
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
            className="rounded-md border-2 border-gray-400 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 p-2 outline-none"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      <Table data={filteredPatients} columns={columns} onRowClick={clickedRow} itemsPerPage={8} />
    </div>
  );
};

export default PatientList;
