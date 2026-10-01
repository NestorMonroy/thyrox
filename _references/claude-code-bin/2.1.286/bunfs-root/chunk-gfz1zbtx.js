// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{wu}from"/$bunfs/root/chunk-hbjpbz2q.js";import{Lt}from"/$bunfs/root/chunk-dsxed40r.js";import{oC}from"/$bunfs/root/chunk-j27hwf9z.js";import{Rt,R}from"/$bunfs/root/chunk-4hjp8tw4.js";function VAt(){return oC("autoContinueAtUsageLimit")[0]}function IXt(e){return VAt()??e==="absent"}var u="tengu_marble_heron";function qMn(){let e=n();return o(e)?e:{}}function nEe(){let e=n();return r(o(e)?e.enabled:e)}function qAt(){return wu()&&!Rt()&&!Lt()}function _fo(){return qAt()&&nEe()}function PXt(){return r(qMn().autoArm)}function n(){return R(u,{})}function o(e){return typeof e==="object"&&e!==null&&!Array.isArray(e)}function r(e){if(e===void 0)return!0;if(typeof e==="string"){let t=e.trim().toLowerCase();return t!==""&&t!=="false"&&t!=="0"}return Boolean(e)}
export{VAt,IXt,qMn,nEe,qAt,_fo,PXt};
