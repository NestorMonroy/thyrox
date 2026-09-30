// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{L}from"/$bunfs/root/chunk-z1tzjygm.js";function gme(n){switch(n){case"hipaa":return"HIPAA";case"zdr":return"ZDR (Zero Data Retention)";default:return t(`Unknown compliance_taint '${n}' from policyLimits`,{level:"warn"}),r}}var r="Organization policy",a=new Set(["hipaa","zdr"]);function a0t(n){return a.has(n)||!1}function l0t(n){let e=L(n),i=e.filter(a0t);if(i.length===e.length)return i;return t(`Unknown compliance_taint values from policyLimits (${e.length-i.length})`,{level:"warn"}),[...i,r]}var o=new Set(["hipaa"]);function Zie(n){return L(n).filter((e)=>o.has(e))}
export{gme,a0t,l0t,Zie};
