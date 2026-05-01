"use client";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

const data = [
    { month: "Jan", savings: 400000 },
    { month: "Feb", savings: 300000 },
    { month: "Mar", savings: 500000 },
    { month: "Apr", savings: 450000 },
    { month: "May", savings: 550000 },
    { month: "Jun", savings: 700000 },
    { month: "Jul", savings: 600000 },
    { month: "Aug", savings: 650000 },
    { month: "Sep", savings: 500000 },
    { month: "Oct", savings: 550000 },
    { month: "Nov", savings: 450000 },
    { month: "Dec", savings: 800000 },
];

// Add cumulative savings for the line
const enrichedData = data.map((item, index) => {
    const total = data
        .slice(0, index + 1)
        .reduce((sum, curr) => sum + curr.savings, 0);

    return {
        ...item,
        cumulative: total,
    };
});

export default function MonthlyCombinedChart() {
    return (
        <div className="bg-white border rounded-xl p-6">

            <h2 className="text-gray-700 font-semibold mb-4">
                Savings Overview (Monthly + Growth)
            </h2>

            <div style={{ width: "100%", height: 300 }}>

                <ResponsiveContainer>

                    <BarChart data={enrichedData}>

                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis dataKey="month" />
                        <YAxis />

                        <Tooltip
                            formatter={(value: number) =>
                                `UGX ${value.toLocaleString()}`
                            }
                        />

                        <Legend />

                        {/* Bars → Monthly savings */}
                        <Bar
                            dataKey="savings"
                            fill="#16a34a"
                            radius={[6, 6, 0, 0]}
                            name="Monthly Savings"
                        />

                        {/* Line → Cumulative savings */}
                        <Line
                            type="monotone"
                            dataKey="cumulative"
                            stroke="#2563eb"
                            strokeWidth={3}
                            name="Total Savings"
                        />

                    </BarChart>

                </ResponsiveContainer>

            </div>
        </div>
    );
}