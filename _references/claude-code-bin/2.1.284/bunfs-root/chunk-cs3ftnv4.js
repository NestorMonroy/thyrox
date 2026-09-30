// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{wu}from"/$bunfs/root/chunk-d37h8mav.js";import{Lt}from"/$bunfs/root/chunk-hqy3a2gr.js";import{IA}from"/$bunfs/root/chunk-r03mjfax.js";import{kt,x}from"/$bunfs/root/chunk-swk3rjnt.js";function fTt(){return IA("autoContinueAtUsageLimit")[0]}function s9t(e){return fTt()??e==="absent"}var u="tengu_marble_heron";function WIn(){let e=n();return o(e)?e:{}}function fve(){let e=n();return r(o(e)?e.enabled:e)}function mTt(){return wu()&&!kt()&&!Lt()}function bco(){return mTt()&&fve()}function i9t(){return r(WIn().autoArm)}function n(){return x(u,{})}function o(e){return typeof e==="object"&&e!==null&&!Array.isArray(e)}function r(e){if(e===void 0)return!0;if(typeof e==="string"){let t=e.trim().toLowerCase();return t!==""&&t!=="false"&&t!=="0"}return Boolean(e)}
export{fTt,s9t,WIn,fve,mTt,bco,i9t};
