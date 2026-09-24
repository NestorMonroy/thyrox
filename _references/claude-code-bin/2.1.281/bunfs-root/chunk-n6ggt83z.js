// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Oe}from"/$bunfs/root/chunk-4a5nddj6.js";import{Wd,Vn}from"/$bunfs/root/chunk-cqc88nqm.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";function Ei(){if(!Oe(process.env.CLAUDE_CODE_COORDINATOR_MODE))return!1;if(Wd()&&!Vn()&&!a.CLAUDE_CODE_REMOTE)return!1;return!0}function ype(e){return Ei()&&e.agentId===void 0}
export{Ei,ype};
