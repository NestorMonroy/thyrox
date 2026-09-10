// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{vi}from"/$bunfs/root/chunk-vfzpzvem.js";function _yr(o){return o.some((r)=>("role"in r.config)&&r.config.role==="comms")}function YVt(o){return o.mcpInfo?.role==="comms"}function y2(o){if(vi())return o.filter((r)=>!YVt(r));return o}
export{_yr,YVt,y2};
