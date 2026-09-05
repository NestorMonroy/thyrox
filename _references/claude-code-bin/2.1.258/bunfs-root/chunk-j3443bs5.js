// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{L}from"/$bunfs/root/chunk-8qt7d28b.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";function t(){return process.argv.includes("--agent-teams")}function Zr(){if(!a.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS&&!t())return!1;if(!L("tengu_amber_flint",!0))return!1;return!0}async function bhn(){if(!Zr())return;let{captureTeammateModeSnapshot:e}=await import("/$bunfs/root/chunk-y4zyrv06.js");e()}
export{Zr,bhn};
