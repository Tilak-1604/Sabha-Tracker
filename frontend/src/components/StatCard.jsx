/**
 * @param {{ label: string, value: string|number, sub?: string }} props
 */
export default function StatCard({ label, value, sub }) {
    return (
        <div className="stat-card">
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
            {sub && <span className="stat-sub">{sub}</span>}
        </div>
    );
}
