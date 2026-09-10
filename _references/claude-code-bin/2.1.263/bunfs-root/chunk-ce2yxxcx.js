// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{ad,On}from"/$bunfs/root/chunk-k6vqz9fa.js";import{xe}from"/$bunfs/root/chunk-8a7jwk3w.js";import{a}from"/$bunfs/root/chunk-bxegdt3f.js";function vi(){if(!xe(process.env.CLAUDE_CODE_COORDINATOR_MODE))return!1;if(ad()&&!On()&&!a.CLAUDE_CODE_REMOTE)return!1;return!0}function QAe(e){return vi()&&e.agentId===void 0}
export{vi,QAe};
