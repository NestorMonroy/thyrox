// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{xi}from"/$bunfs/root/chunk-n7w88aj1.js";function aEr(o){return o.some((r)=>("role"in r.config)&&r.config.role==="comms")}function yUe(o){return o.mcpInfo?.role==="comms"}function Az(o){if(xi())return o.filter((r)=>!yUe(r));return o}
export{aEr,yUe,Az};
