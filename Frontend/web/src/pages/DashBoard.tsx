import WarnList from "../features/dashboard/WarnList";
import Chart from "../components/ui/Chart";

const DashBoard = () => {
  return (
    <div className="p-4">
      <WarnList />
      <div className="mt-6">
        <Chart />
      </div>
    </div>
  );
};
export default DashBoard;
