// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{L}from"/$bunfs/root/chunk-x722nt0q.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";function JC(){return L("tengu_lantern_prism",!1)||a.CLAUDE_CODE_LANTERN_PRISM}function wYe(){return L("tengu_walnut_spire",!1)||a.CLAUDE_CODE_WALNUT_SPIRE}function Fbt(){if(wYe())return{enabled:!0,text:"`claude plugin eval` is ENABLED in this session. Enablement variable for machines that cannot receive the per-organization rollout (Bedrock/Vertex/Foundry, LLM gateways, telemetry-disabled clients, CI runners): `CLAUDE_CODE_WALNUT_SPIRE=1`, set in the shell, in `~/.claude/settings.json` under `env`, or in managed settings `env`. Do not rely on a repository's `.claude/settings.json` (or `settings.local.json`) `env` for it \u2014 the Availability section of the plugin-eval reference explains why a committed value normally leaves the command gated off."+""};return{enabled:!1,text:'`claude plugin eval` is NOT enabled in this session (early access, enabled per organization): it exists but prints "currently in early access" here. If the user asks about it, say that plainly rather than that it does not exist, give the enablement facts from the Availability section of the plugin-eval reference in your prompt or skill files, and do not guess enablement variable names \u2014 a gated-off user obtains the variable from their Anthropic contact.'}}
export{JC,wYe,Fbt};
