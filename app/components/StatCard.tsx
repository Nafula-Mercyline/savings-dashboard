// components/StatCard.tsx

type StatCardProps = {
    title: string;
    value: string | number;
};

export default function StatCard({ title, value }: StatCardProps) {
    return (
        <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h4 className="text-gray-500 text-sm">{title}</h4>
            <p className="text-xl font-semibold text-green-700">{value}</p>
        </div>
    );
}