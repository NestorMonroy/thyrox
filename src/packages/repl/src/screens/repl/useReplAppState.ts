import { useAppState, useAppStateStore, useSetAppState } from "../../appStateHooks.js";
import { selectElicitation, selectMcp } from '@thyrox/app-host/state/mcpSelectors.js';
import {
	selectPendingSandboxRequest,
	selectPendingWorkerRequest,
	selectToolPermissionContext,
	selectWorkerSandboxPermissions,
} from '@thyrox/app-host/state/permissionSelectors.js';
import { selectAgentDefinitions, selectPlugins } from '@thyrox/app-host/state/pluginSelectors.js';
import {
	selectInitialMessage,
	selectIsBriefOnly,
	selectShowRemoteCallout,
	selectSpinnerTip,
	selectVerbose,
} from '@thyrox/app-host/state/sessionSelectors.js';
import { selectFileHistory, selectTasks, selectViewingAgentTaskId } from '@thyrox/app-host/state/taskSelectors.js';
import { selectTeamContext } from '@thyrox/app-host/state/teamSelectors.js';
import {
	selectShowExpandedTodos,
	selectUltraplanLaunchPending,
	selectUltraplanPendingChoice,
} from '@thyrox/app-host/state/uiSelectors.js';

/** El estado que el REPL lee del store, con su tipo NOMBRADO.
 *
 * Sin esta anotacion tsc rehusa emitir la declaracion de
 * `useReplAppState` con TS2742: el tipo inferido alcanza
 * `@thyrox/app-host/node_modules/@thyrox/repl/tasksTypes.js` —una ruta de
 * izado que este paquete no declara— y lo declara «likely not portable».
 *
 * El efecto no es un error visible: tsc SALTA ese `.d.ts` y emite el resto,
 * asi que el paquete quedaba con una declaracion menos y el repunte de su
 * `exports` rehusaba. Cada campo se deriva con `ReturnType<typeof ...>` del
 * selector que ya se importa aqui: ningun tipo transcrito a mano.
 */
export interface ReplAppState {
	verbose: ReturnType<typeof selectVerbose>
	isBriefOnly: ReturnType<typeof selectIsBriefOnly>
	initialMessage: ReturnType<typeof selectInitialMessage>
	spinnerTip: ReturnType<typeof selectSpinnerTip>
	showRemoteCallout: ReturnType<typeof selectShowRemoteCallout>
	toolPermissionContext: ReturnType<typeof selectToolPermissionContext>
	pendingWorkerRequest: ReturnType<typeof selectPendingWorkerRequest>
	pendingSandboxRequest: ReturnType<typeof selectPendingSandboxRequest>
	workerSandboxPermissions: ReturnType<typeof selectWorkerSandboxPermissions>
	mcp: ReturnType<typeof selectMcp>
	elicitation: ReturnType<typeof selectElicitation>
	plugins: ReturnType<typeof selectPlugins>
	agentDefinitions: ReturnType<typeof selectAgentDefinitions>
	tasks: ReturnType<typeof selectTasks>
	viewingAgentTaskId: ReturnType<typeof selectViewingAgentTaskId>
	fileHistory: ReturnType<typeof selectFileHistory>
	teamContext: ReturnType<typeof selectTeamContext>
	showExpandedTodos: ReturnType<typeof selectShowExpandedTodos>
	ultraplanPendingChoice: ReturnType<typeof selectUltraplanPendingChoice>
	ultraplanLaunchPending: ReturnType<typeof selectUltraplanLaunchPending>
	setAppState: ReturnType<typeof useSetAppState>
	store: ReturnType<typeof useAppStateStore>
}

export function useReplAppState(): ReplAppState {
	const verbose = useAppState(selectVerbose);
	const isBriefOnly = useAppState(selectIsBriefOnly);
	const initialMessage = useAppState(selectInitialMessage);
	const spinnerTip = useAppState(selectSpinnerTip);
	const showRemoteCallout = useAppState(selectShowRemoteCallout);
	const toolPermissionContext = useAppState(selectToolPermissionContext);
	const pendingWorkerRequest = useAppState(selectPendingWorkerRequest);
	const pendingSandboxRequest = useAppState(selectPendingSandboxRequest);
	const workerSandboxPermissions = useAppState(selectWorkerSandboxPermissions);
	const mcp = useAppState(selectMcp);
	const elicitation = useAppState(selectElicitation);
	const plugins = useAppState(selectPlugins);
	const agentDefinitions = useAppState(selectAgentDefinitions);
	const tasks = useAppState(selectTasks);
	const viewingAgentTaskId = useAppState(selectViewingAgentTaskId);
	const fileHistory = useAppState(selectFileHistory);
	const teamContext = useAppState(selectTeamContext);
	const showExpandedTodos = useAppState(selectShowExpandedTodos);
	const ultraplanPendingChoice = useAppState(selectUltraplanPendingChoice);
	const ultraplanLaunchPending = useAppState(selectUltraplanLaunchPending);
	const setAppState = useSetAppState();
	const store = useAppStateStore();

	return {
		verbose,
		isBriefOnly,
		initialMessage,
		spinnerTip,
		showRemoteCallout,
		toolPermissionContext,
		pendingWorkerRequest,
		pendingSandboxRequest,
		workerSandboxPermissions,
		mcp,
		elicitation,
		plugins,
		agentDefinitions,
		tasks,
		viewingAgentTaskId,
		fileHistory,
		teamContext,
		showExpandedTodos,
		ultraplanPendingChoice,
		ultraplanLaunchPending,
		setAppState,
		store,
	};
}
