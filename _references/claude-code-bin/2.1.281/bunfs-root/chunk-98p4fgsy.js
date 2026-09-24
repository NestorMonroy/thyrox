// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Wd}from"/$bunfs/root/chunk-cqc88nqm.js";import{Nt}from"/$bunfs/root/chunk-xe0dn6dd.js";import{PT}from"/$bunfs/root/chunk-pw35yar9.js";import{Tt,x}from"/$bunfs/root/chunk-5khn4tvf.js";function R_t(){return PT("autoContinueAtUsageLimit")[0]}function iVt(e){return R_t()??e==="absent"}var u="tengu_marble_heron";function wwn(){let e=n();return o(e)?e:{}}function r_e(){let e=n();return r(o(e)?e.enabled:e)}function x_t(){return Wd()&&!Tt()&&!Nt()}function S5r(){return x_t()&&r_e()}function aVt(){return r(wwn().autoArm)}function n(){return x(u,{})}function o(e){return typeof e==="object"&&e!==null&&!Array.isArray(e)}function r(e){if(e===void 0)return!0;if(typeof e==="string"){let t=e.trim().toLowerCase();return t!==""&&t!=="false"&&t!=="0"}return Boolean(e)}
export{R_t,iVt,wwn,r_e,x_t,S5r,aVt};
