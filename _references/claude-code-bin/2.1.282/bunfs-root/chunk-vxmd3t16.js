// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{x}from"/$bunfs/root/chunk-wbbthbh9.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";function t(){return process.argv.includes("--agent-teams")}function uo(){if(!a.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS&&!t())return!1;if(!x("tengu_amber_flint",!0))return!1;return!0}async function dhr(){if(!uo())return;let{captureTeammateModeSnapshot:e}=await import("/$bunfs/root/chunk-s7zgkh8q.js");e()}
export{uo,dhr};
