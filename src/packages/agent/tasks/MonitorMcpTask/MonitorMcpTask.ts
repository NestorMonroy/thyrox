// Auto-generated stub — replace with real implementation
import type { TaskStateBase, SetAppState } from '@thyrox/tool-registry/Task.js';
import type { AppState } from '@thyrox/app-host/state/AppState.js';
import type { AgentId } from '@thyrox/repl/replTypes/ids.js';

export type MonitorMcpTaskState = TaskStateBase & {
  type: 'monitor_mcp';
};
export const killMonitorMcp: (taskId: string, setAppState: SetAppState) => void = (() => {});
export const killMonitorMcpTasksForAgent: (agentId: AgentId, getAppState: () => AppState, setAppState: SetAppState) => void = (() => {});
