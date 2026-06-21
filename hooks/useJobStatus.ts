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
    // Only skip opening a connection if we already know it's terminal
    // BEFORE subscribing — checking initialStatus (a prop), not state
    // (which changes on every message and would cause a reconnect loop)
    if (initialStatus === "COMPLETED" || initialStatus === "FAILED") return;

    const es = new EventSource(`/api/status/${pullRequestId}`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data) as StatusState;
      setState(data);

      if (data.status === "COMPLETED" || data.status === "FAILED") {
        es.close();
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();

    // pullRequestId and initialStatus only — NOT state.status.
    // Including state.status here was the bug: it closed and reopened
    // the EventSource on every single SSE message.
  }, [pullRequestId, initialStatus]);

  return state;
}