// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{nFc as n,sGc as r}from"/$bunfs/root/_701.js";import{xxd as i}from"/$bunfs/root/_837.js";function S(t){let e=n("policySettings")?.strictPluginOnlyCustomization;if(e===!0)return!0;if(Array.isArray(e))return e.includes(t);return!1}function l(t){return t!==void 0&&o.has(t)}var o;var u=i(()=>{r();o=new Set(["plugin","policySettings","built-in","builtin","bundled"])});
export{S as wAb,l as xAb,u as yAb};
