interface PatientItem {
  id: string;
  name: string;
  status: "normal" | "warning" | string; // Thêm string nếu cần mở rộng
}

interface PatientListProps {
  patients?: PatientItem[];
}

import { mockPatientList } from "../../data/mockData";

const PatientList = ({ patients = mockPatientList }: PatientListProps) => {
  return (
    <>
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Danh sách bệnh nhân</h2>
        <table className="min-w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b">ID Bệnh nhân</th>
              <th className="px-4 py-2 border-b">Tên</th>
              <th className="px-4 py-2 border-b">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id} className="hover:bg-gray-100">
                <td className="px-4 py-2 border-b">{patient.id}</td>
                <td className="px-4 py-2 border-b">{patient.name}</td>
                <td className="px-4 py-2 border-b">
                  <span
                    className={`px-2 py-1 rounded-full text-sm font-medium ${
                      patient.status === "normal"
                        ? "bg-green-100 text-green-800"
                        : patient.status === "warning"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {patient.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PatientList;
