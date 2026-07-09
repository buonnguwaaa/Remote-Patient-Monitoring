import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Table, { type Column } from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import { getAlerts, getMyPatientsPaginated } from "../../services/patientService";
import type { PatientItem } from "../../types/patient";
import { Chat, Edit } from "./ActionButton";

const ITEMS_PER_PAGE = 10;

const PatientList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchPatients = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      // Simulate 500ms network delay for testing skeleton loader
      await new Promise((resolve) => setTimeout(resolve, 500));

      const [assignmentsResult, alerts] = await Promise.all([
        getMyPatientsPaginated(page, ITEMS_PER_PAGE),
        getAlerts({ limit: 1000, page: 1, sortOrder: "desc" })
      ]);

      setTotalItems(assignmentsResult.total);

      const patientSeverity = new Map<string, string>();

      alerts.forEach((alert) => {
        if (alert.status === "open") {
          const curr = patientSeverity.get(alert.patientId);
          if (
            !curr ||
            (curr !== "high" && alert.severity === "high") ||
            (curr === "low" && alert.severity === "medium")
          ) {
            patientSeverity.set(alert.patientId, alert.severity);
          }
        }
      });

      const patientItems: PatientItem[] = assignmentsResult.data.map((assignment) => {
        let status: PatientItem["status"] = t("patients.normal");

        const severity = patientSeverity.get(assignment.patientId);
        if (severity === "high" || severity === "medium") {
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
  }, [t]);

  useEffect(() => {
    void fetchPatients(currentPage);
  }, [currentPage, fetchPatients]);

  // Client-side filtering on the current page's data
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

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const columns: Column<PatientItem>[] = [
    {
      header: t("patients.index"),
      render: (patient) => <span className="font-bold">{(currentPage - 1) * ITEMS_PER_PAGE + filteredPatients.indexOf(patient) + 1}</span>,
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="w-2/3 space-y-2">
                  <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="mb-3 h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))
        ) : filteredPatients.length === 0 ? (
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("patients.index")} {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</p>
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

        {/* Mobile pagination */}
        {(totalPages > 1 || loading) && (
          <div className={`flex justify-center pt-2 ${loading ? "opacity-60 pointer-events-none" : ""}`}>
            {loading && totalItems === 0 ? (
              <div className="flex h-8 items-center gap-1">
                <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
                <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
                <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
                <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => !loading && handlePageChange(page)}
              />
            )}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <Table
          data={filteredPatients}
          columns={columns}
          onRowClick={clickedRow}
          paginated={false}
          loading={loading}
          loadingRows={ITEMS_PER_PAGE}
        />

        {/* Server-side pagination */}
        {(totalPages > 1 || loading) && (
          <div className={`mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row ${loading ? "opacity-60 pointer-events-none" : ""}`}>
            {loading && totalItems === 0 ? (
              <>
                <div className="h-4 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="flex h-8 items-center gap-1">
                  <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
                  <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
                  <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
                  <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("common.showing")}{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}
                  </span>{" "}
                  {t("common.of")}{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {totalItems}
                  </span>
                </p>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => !loading && handlePageChange(page)}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientList;
