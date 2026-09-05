// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{jhd as n,ohd as r}from"/$bunfs/root/_820.js";r();function o(e){switch(e){case"hipaa":return"HIPAA";case"zdr":return"ZDR (Zero Data Retention)";default:return n(`Unknown compliance_taint '${e}' from policyLimits`,{level:"warn"}),e}}
export{o as nq};
