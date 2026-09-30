// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Le}from"/$bunfs/root/chunk-2j44ssk9.js";import{_u,Yn}from"/$bunfs/root/chunk-nvht7ckf.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";function Li(){if(!Le(process.env.CLAUDE_CODE_COORDINATOR_MODE))return!1;if(_u()&&!Yn()&&!a.CLAUDE_CODE_REMOTE)return!1;return!0}function Pge(e){return Li()&&e.agentId===void 0}
export{Li,Pge};
