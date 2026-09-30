// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Oe}from"/$bunfs/root/chunk-zt13kgz5.js";import{ou,qn}from"/$bunfs/root/chunk-zwm3fybx.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";function xi(){if(!Oe(process.env.CLAUDE_CODE_COORDINATOR_MODE))return!1;if(ou()&&!qn()&&!a.CLAUDE_CODE_REMOTE)return!1;return!0}function Pfe(e){return xi()&&e.agentId===void 0}
export{xi,Pfe};
