import { requestLocalHelper } from "../localHelper/client";

export type DaisoStatus = {
  installed: boolean;
  available: boolean;
  command: string;
  status: string;
  endpoint: string;
  checkedAt: string;
  error: string | null;
};

export type DaisoRunResult = {
  ok: boolean;
  needsUserInput: boolean;
  featureGuide?: boolean;
  directReply?: string;
  command?: string;
  commandLine?: string;
  context?: string;
  data?: unknown;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
  message: string;
};

export function getDaisoStatus() {
  return requestLocalHelper<DaisoStatus>("/daiso/status");
}

export function runDaisoRequest(prompt: string) {
  return requestLocalHelper<DaisoRunResult>("/daiso/run", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}
