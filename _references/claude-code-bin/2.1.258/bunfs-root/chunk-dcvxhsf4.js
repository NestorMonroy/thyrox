// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Ou}from"/$bunfs/root/chunk-7y3dpmev.js";var r="self_hosted_runner_";function e(n){return n.startsWith(r)}function QAr(n){return Ou([...n]).some(e)}function Rfr(n){return Ou([n]).filter((t)=>!e(t)).join(",")}function eRt(n){if(n===void 0)return!1;let t=typeof n==="string"?n:String(n);return Ou([t]).some(e)}function dJt(n){let t=n.tools;if(t===void 0)return n;let o=typeof t==="string"?t:String(t);if(!eRt(o))return typeof t==="string"?n:{...n,tools:o};return{...n,tools:Rfr(o)}}
export{QAr,Rfr,eRt,dJt};
