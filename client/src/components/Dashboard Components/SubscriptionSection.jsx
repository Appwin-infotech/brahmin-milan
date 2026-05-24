import { useMemo } from "react";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend
);

const SubscriptionSection = ({ subscriptions }) => {
  const now = new Date();

  const filtered = useMemo(() => {
    return subscriptions?.filter((sub) => sub.paymentDate);
  }, [subscriptions]);

  const currentMonthIncome = filtered.reduce((sum, sub) => {
    const date = new Date(sub.paymentDate);
    return date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
      ? sum + sub.service.amount
      : sum;
  }, 0);

  const currentYearIncome = filtered.reduce((sum, sub) => {
    const date = new Date(sub.paymentDate);
    return date.getFullYear() === now.getFullYear()
      ? sum + sub.service.amount
      : sum;
  }, 0);

  const monthlyIncomeData = useMemo(() => {
    const incomeByMonth = Array(12).fill(0);
    filtered.forEach((sub) => {
      const date = new Date(sub.paymentDate);
      if (date.getFullYear() === now.getFullYear()) {
        incomeByMonth[date.getMonth()] += sub.service.amount;
      }
    });
    return {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      datasets: [
        {
          label: "Monthly Income",
          data: incomeByMonth,
          backgroundColor: "#3b82f6",
          borderRadius: 6,
        },
      ],
    };
  }, [filtered]);

  const serviceTypeData = useMemo(() => {
    const typeCount = {};
    filtered.forEach((sub) => {
      const type = sub.service.serviceType;
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    return {
      labels: Object.keys(typeCount),
      datasets: [
        {
          label: "Service Type",
          data: Object.values(typeCount),
          backgroundColor: [
            "#f59e0b",
            "#10b981",
            "#3b82f6",
            "#ef4444",
            "#8b5cf6",
          ],
        },
      ],
    };
  }, [filtered]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 100 } },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 14, font: { size: 12 } },
      },
    },
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-bold mb-4">Subscriptions</h2>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 text-blue-800 p-3 rounded">
          <p className="text-sm font-semibold">This Month</p>
          <p className="text-lg font-bold">₹ {currentMonthIncome}</p>
        </div>
        <div className="bg-green-100 text-green-800 p-3 rounded">
          <p className="text-sm font-semibold">This Year</p>
          <p className="text-lg font-bold">₹ {currentYearIncome}</p>
        </div>
        <div className="bg-purple-100 text-purple-800 p-3 rounded">
          <p className="text-sm font-semibold">Total Subscriptions</p>
          <p className="text-lg font-bold">{filtered.length}</p>
        </div>
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded">
          <p className="text-sm font-semibold">Unique Users</p>
          <p className="text-lg font-bold">
            {new Set(filtered.map((sub) => sub.userId?._id)).size}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64">
          <h3 className="text-md font-semibold mb-2">Income by Month</h3>
          <Bar data={monthlyIncomeData} options={barOptions} />
        </div>
        <div className="h-64">
          <h3 className="text-md font-semibold mb-2">
            Subscriptions by Service Type
          </h3>
          <Pie data={serviceTypeData} options={pieOptions} />
        </div>
      </div>

      {/* View More Button */}
      <div className="mt-6 flex justify-end">
        <a
          href="/manage-subscriptions"
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          View More
        </a>
      </div>
    </div>
  );
};

export default SubscriptionSection;
