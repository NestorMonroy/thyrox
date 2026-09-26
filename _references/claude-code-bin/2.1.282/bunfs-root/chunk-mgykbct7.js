// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Cr,g3}from"/$bunfs/root/chunk-37swe2q7.js";function Ihr(n,e){return e&&!n.restricted?{...n,restricted:!0}:n}function Epe(n){return Cr()||g3()||[n.permissionMode,n.inheritPermissionMode,n.model,n.fallbackModel,n.effort,n.agent,n.agents,n.settings,n.projectConfigRoot,n.appendSystemPrompt,n.appendSystemPromptFile,n.systemPrompt,n.systemPromptFile,n.systemPromptSnapshot,n.replyOnResume,n.permissionPromptTool,n.settingSources,n.managedSettings].some((e)=>e!==void 0)||Boolean(n.disableSlashCommands)||n.sessionPersistence===!1||Boolean(n.dangerouslySkipPermissions)||Boolean(n.allowDangerouslySkipPermissions)||Boolean(n.allowBypass)||Boolean(n.restricted)||Boolean(n.ide)||Boolean(n.strictMcpConfig)||(n.allowedTools??[]).length>0||(n.disallowedTools??[]).length>0||(n.tools??[]).length>0||(n.mcpConfig??[]).length>0||(n.addDir??[]).length>0||(n.pluginDir??[]).length>0||(n.pluginDirNoMcp??[]).length>0}function Phr(n){return[n.systemPrompt,n.systemPromptFile,n.appendSystemPromptFile,n.permissionPromptTool,n.settingSources,n.managedSettings,n.projectConfigRoot].some((e)=>e!==void 0)||(n.tools??[]).some((e)=>e!=="default")}var UAt="a custom system prompt, a tool allowlist, or restricted settings";
export{Ihr,Epe,Phr,UAt};
