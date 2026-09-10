// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Ts}from"/$bunfs/root/chunk-2c6wtwmz.js";function SIr(o){return o.some((r)=>("role"in r.config)&&r.config.role==="comms")}function LVt(o){return o.mcpInfo?.role==="comms"}function G2(o){if(Ts())return o.filter((r)=>!LVt(r));return o}
export{SIr,LVt,G2};
