// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{nd,Fn}from"/$bunfs/root/chunk-x1rrg5j2.js";import{$e}from"/$bunfs/root/chunk-jdw11prg.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";function xs(){if(!$e(process.env.CLAUDE_CODE_COORDINATOR_MODE))return!1;if(nd()&&!Fn()&&!a.CLAUDE_CODE_REMOTE)return!1;return!0}function lke(e){return xs()&&e.agentId===void 0}
export{xs,lke};
