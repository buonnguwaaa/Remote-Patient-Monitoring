import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Table, { type Column } from "../../components/ui/Table";
import { getAlerts, getMyPatients } from "../../services/patientService";
import type { PatientItem } from "../../types/patient";
import { Chat, Edit } from "./ActionButton";

const PatientList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
          let status: PatientItem["status"] = t("patients.normal");

          const latestAlert = latestAlertByPatient.get(assignment.patientId);
          if (latestAlert && (latestAlert.severity === "high" || latestAlert.severity === "medium") && latestAlert.status === "open") {
            status = t("patients.warning");
          }

          return {
            id: assignment.patientId,
            name: assignment.patientName || t("common.noData"),
            patientCode: assignment.patientCode || t("patients.noCode"),
            updatedAt: assignment.updatedAt
              ? new Date(assignment.updatedAt).toISOString().split("T")[0]
              : undefined,
            status,
          };
        });

        setPatients(patientItems);
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || t("patients.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void fetchPatients();
  }, [t]);

  const filteredPatients = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return patients.filter((patient) => {
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
  }, [patients, filterStatus, searchQuery]);

  const columns: Column<PatientItem>[] = [
    {
      header: t("patients.index"),
      render: (patient) => <span className="font-bold">{filteredPatients.indexOf(patient) + 1}</span>,
      className: "w-10 px-3",
    },
    {
      header: t("patients.patientCode"),
      accessor: "patientCode",
      className: "font-medium text-gray-700 dark:text-slate-300",
    },
    {
      header: t("patients.patientName"),
      accessor: "name",
      className: "font-medium text-gray-900 dark:text-slate-100",
    },
    {
      header: t("patients.updatedAt"),
      accessor: "updatedAt",
    },
    {
      header: t("patients.status"),
      render: (patient) => (
        <div
          className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
            patient.status === t("patients.normal")
              ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400"
              : "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400"
          }`}
        >
          <span>{patient.status}</span>
        </div>
      ),
    },
    {
      header: t("common.actions"),
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
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/patient/${patient.id}`);
            }}
          />
        </div>
      ),
    },
  ];

  const renderStatusBadge = (status: PatientItem["status"]) => {
    return (
      <span
        className={`inline-flex w-fit whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
          status === t("patients.normal")
            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"
        }`}
      >
        {status}
      </span>
    );
  };

  const clickedRow = (patient: PatientItem) => {
    navigate(`/patient/${patient.id}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-slate-900 md:p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">{t("patients.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 dark:bg-slate-900 md:p-8">
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4 text-red-700 dark:text-red-400">
          <p className="font-semibold">{t("common.error")}</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 dark:bg-slate-900 md:p-8">
      <h1 className="mb-4 text-2xl font-bold text-gray-800 dark:text-slate-100 md:text-3xl">{t("patients.title")}</h1>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
        <div className="w-full flex-1">
          <input
            type="text"
            placeholder={t("patients.searchPlaceholder")}
            className="w-full rounded-md border-2 border-gray-300 bg-white p-2 text-gray-700 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            className="w-full rounded-md border-2 border-gray-300 bg-white p-2 text-gray-700 outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="">{t("patients.allStatuses")}</option>
            <option value={t("patients.normal")}>{t("patients.normal")}</option>
            <option value={t("patients.warning")}>{t("patients.warning")}</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredPatients.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            {t("common.noData")}
          </div>
        ) : (
          filteredPatients.map((patient, index) => (
            <div
              key={patient.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("patients.index")} {index + 1}</p>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{patient.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("patients.patientCode")}: {patient.patientCode}</p>
                </div>
                {renderStatusBadge(patient.status)}
              </div>

              <div className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                {t("patients.updatedAt")}: {patient.updatedAt || "-"}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/patient/chat/${patient.id}`)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Chat iconSize={18} />
                  {t("chat.title")}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/patient/${patient.id}`)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Edit iconSize={16} />
                  {t("patients.viewDetails")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block">
        <Table data={filteredPatients} columns={columns} onRowClick={clickedRow} itemsPerPage={20} />
      </div>
    </div>
  );
};

export default PatientList;
