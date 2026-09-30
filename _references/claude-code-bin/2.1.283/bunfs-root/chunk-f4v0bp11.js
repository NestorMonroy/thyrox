// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{_u}from"/$bunfs/root/chunk-nvht7ckf.js";import{Dt}from"/$bunfs/root/chunk-m8ebe51k.js";import{gA}from"/$bunfs/root/chunk-ckctvm5v.js";import{vt,x}from"/$bunfs/root/chunk-t6pwageh.js";function lEt(){return gA("autoContinueAtUsageLimit")[0]}function C6t(e){return lEt()??e==="absent"}var u="tengu_marble_heron";function PRn(){let e=n();return o(e)?e:{}}function swe(){let e=n();return r(o(e)?e.enabled:e)}function cEt(){return _u()&&!vt()&&!Dt()}function Zoo(){return cEt()&&swe()}function R6t(){return r(PRn().autoArm)}function n(){return x(u,{})}function o(e){return typeof e==="object"&&e!==null&&!Array.isArray(e)}function r(e){if(e===void 0)return!0;if(typeof e==="string"){let t=e.trim().toLowerCase();return t!==""&&t!=="false"&&t!=="0"}return Boolean(e)}
export{lEt,C6t,PRn,swe,cEt,Zoo,R6t};
