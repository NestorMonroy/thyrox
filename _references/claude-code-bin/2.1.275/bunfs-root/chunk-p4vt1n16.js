// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Oe}from"/$bunfs/root/chunk-aw1peprz.js";import{Yd,Kn}from"/$bunfs/root/chunk-4qqe0nh4.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";function si(){if(!Oe(process.env.CLAUDE_CODE_COORDINATOR_MODE))return!1;if(Yd()&&!Kn()&&!a.CLAUDE_CODE_REMOTE)return!1;return!0}function X$e(e){return si()&&e.agentId===void 0}
export{si,X$e};
