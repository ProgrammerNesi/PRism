export default function RiskScoreBadge({ score }: { score: number }) {
  const level =
    score <= 25 ? { label: "Low Risk",      color: "bg-green-100 text-green-700"  } :
    score <= 50 ? { label: "Medium Risk",   color: "bg-yellow-100 text-yellow-700"} :
    score <= 75 ? { label: "High Risk",     color: "bg-orange-100 text-orange-700"} :
                  { label: "Critical Risk", color: "bg-red-100 text-red-700"      };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${level.color}`}>
      {score}/100 · {level.label}
    </span>
  );
}