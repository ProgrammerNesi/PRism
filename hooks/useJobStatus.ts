"use client";

import { useEffect, useState } from "react";

export type JobStatus =
  | "PENDING" | "QUEUED" | "CLONING" | "INDEXING"
  | "RETRIEVING" | "REVIEWING" | "POSTING"
  | "COMPLETED" | "FAILED";

interface StatusState {
  status: JobStatus;
  message: string;
}

export function useJobStatus(
  pullRequestId: string,
  initialStatus: JobStatus
): StatusState {
  const [state, setState] = useState<StatusState>({
    status: initialStatus,
    message: "",
  });

  useEffect(() => {
    if (state.status === "COMPLETED" || state.status === "FAILED") return;

    const es = new EventSource(`/api/status/${pullRequestId}`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as StatusState;
      setState(data);
      if (data.status === "COMPLETED" || data.status === "FAILED") {
        es.close();
      }
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, [pullRequestId, state.status]);

  return state;
}