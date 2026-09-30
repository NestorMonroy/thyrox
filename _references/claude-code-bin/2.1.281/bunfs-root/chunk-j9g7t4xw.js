// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{b,hn}from"/$bunfs/root/chunk-rnxz8hs2.js";function be(n){if(n==null)return;return/^[A-Za-z0-9_-]{1,128}$/.test(n)?hn(n):b("nonconforming")}function wct(n){return hn(n.map((r)=>be(r)).join(","))}
export{be,wct};
