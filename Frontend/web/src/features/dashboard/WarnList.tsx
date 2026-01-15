import { type WarnItem } from "../../types";
import { mockWarnList } from "../../data/mockData";

interface WarnListProps {
  warns?: WarnItem[];
}

const WarnList = ({ warns = mockWarnList }: WarnListProps) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h1 className="font-bold text-text text-xl">Danh sách cảnh báo</h1>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead className=" ">
            <tr className=" font-semibold">
              <th className="px-4 py-3 text-left font-semibold text-text w-1/7">
                Bệnh nhân
              </th>
              <th className="px-4 py-3 text-center font-semibold text-text">
                Huyết áp tâm thu
              </th>
              <th className="px-4 py-3 text-center font-semibold text-text">
                Huyết áp tâm trương
              </th>
              <th className="px-4 py-3 text-center font-semibold text-text">
                Nhịp tim
              </th>
              <th className="px-4 py-3 text-center font-semibold text-text">
                Nhịp thở
              </th>
              <th className="px-4 py-3 text-center font-semibold text-text">
                Đường huyết
              </th>
            </tr>
          </thead>

          <tbody className="">
            {warns.map((warn, index) => (
              <tr
                key={index}
                className=" hover:bg-gray-100 transition-colors font-semibold text-text-muted text-left cursor-pointer"
              >
                <td className="px-4 py-3 ">{warn.name}</td>
                <td className="px-4 py-3 text-center">{warn.systolic}mg/dL</td>
                <td className="px-4 py-3 text-center">{warn.diastolic}mg/dL</td>
                <td className="px-4 py-3 text-center">{warn.heartRate}bpm</td>
                <td className="px-4 py-3 text-center">{warn.respiratoryRate ?? "--"}bpm</td>
                <td className="px-4 py-3 text-center">
                  {warn.bloodSugar}mg/dL
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WarnList;
