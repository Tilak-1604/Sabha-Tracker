/**
 * @param {{ absentPct: number, level: 'safe'|'warning'|'danger', rule: string }} props
 */
export default function FineBar({ absentPct, level, rule }) {
    const pct = Math.min(absentPct, 100);
    return (
        <div className="fine-bar-wrap">
            <div className="fine-bar-labels">
                <span>Absent: {absentPct.toFixed(1)}%</span>
                <span className={`badge badge-${level}`}>{level.toUpperCase()}</span>
            </div>
            <div className="fine-bar-track">
                <div
                    className={`fine-bar-fill ${level}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{rule}</span>
        </div>
    );
}
