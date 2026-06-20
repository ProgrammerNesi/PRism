"use client";

import { useJobStatus, JobStatus } from "@/hooks/useJobStatus";

const CONFIG: Record<JobStatus, { label: string; color: string; pulse: boolean }> = {
  PENDING:    { label: "Pending",    color: "bg-gray-100 text-gray-500",     pulse: false },
  QUEUED:     { label: "Queued",     color: "bg-blue-100 text-blue-600",     pulse: true  },
  CLONING:    { label: "Cloning",    color: "bg-blue-100 text-blue-600",     pulse: true  },
  INDEXING:   { label: "Indexing",   color: "bg-violet-100 text-violet-600", pulse: true  },
  RETRIEVING: { label: "Retrieving", color: "bg-violet-100 text-violet-600", pulse: true  },
  REVIEWING:  { label: "Reviewing",  color: "bg-amber-100 text-amber-600",   pulse: true  },
  POSTING:    { label: "Posting",    color: "bg-orange-100 text-orange-600", pulse: true  },
  COMPLETED:  { label: "Reviewed",   color: "bg-green-100 text-green-700",   pulse: false },
  FAILED:     { label: "Failed",     color: "bg-red-100 text-red-600",       pulse: false },
};

export default function StatusBadge({
  pullRequestId,
  initialStatus,
}: {
  pullRequestId: string;
  initialStatus: JobStatus;
}) {
  const { status, message } = useJobStatus(pullRequestId, initialStatus);
  const config = CONFIG[status] ?? CONFIG.PENDING;

  return (
    <span
      title={message}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {config.label}
    </span>
  );
}