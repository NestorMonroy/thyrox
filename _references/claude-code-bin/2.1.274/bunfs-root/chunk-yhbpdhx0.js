// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Pe}from"/$bunfs/root/chunk-tep8see7.js";import{Hd,Wn}from"/$bunfs/root/chunk-ja309z9r.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";function si(){if(!Pe(process.env.CLAUDE_CODE_COORDINATOR_MODE))return!1;if(Hd()&&!Wn()&&!a.CLAUDE_CODE_REMOTE)return!1;return!0}function XLe(e){return si()&&e.agentId===void 0}
export{si,XLe};
