// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{bu}from"/$bunfs/root/chunk-bxhyh54r.js";import{Nt}from"/$bunfs/root/chunk-a1fdkwrj.js";import{BA}from"/$bunfs/root/chunk-g6a51st9.js";import{At,x}from"/$bunfs/root/chunk-f74xvn8g.js";function Ykt(){return BA("autoContinueAtUsageLimit")[0]}function c8t(e){return Ykt()??e==="absent"}var u="tengu_marble_heron";function pPn(){let e=n();return o(e)?e:{}}function dve(){let e=n();return r(o(e)?e.enabled:e)}function Xkt(){return bu()&&!At()&&!Nt()}function dco(){return Xkt()&&dve()}function d8t(){return r(pPn().autoArm)}function n(){return x(u,{})}function o(e){return typeof e==="object"&&e!==null&&!Array.isArray(e)}function r(e){if(e===void 0)return!0;if(typeof e==="string"){let t=e.trim().toLowerCase();return t!==""&&t!=="false"&&t!=="0"}return Boolean(e)}
export{Ykt,c8t,pPn,dve,Xkt,dco,d8t};
