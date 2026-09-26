// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ou}from"/$bunfs/root/chunk-zwm3fybx.js";import{Lt}from"/$bunfs/root/chunk-36kx407g.js";import{XI}from"/$bunfs/root/chunk-verj0kzw.js";import{Et,x}from"/$bunfs/root/chunk-wbbthbh9.js";function iSt(){return XI("autoContinueAtUsageLimit")[0]}function xKt(e){return iSt()??e==="absent"}var u="tengu_marble_heron";function HEn(){let e=n();return o(e)?e:{}}function ibe(){let e=n();return r(o(e)?e.enabled:e)}function aSt(){return ou()&&!Et()&&!Lt()}function mJr(){return aSt()&&ibe()}function IKt(){return r(HEn().autoArm)}function n(){return x(u,{})}function o(e){return typeof e==="object"&&e!==null&&!Array.isArray(e)}function r(e){if(e===void 0)return!0;if(typeof e==="string"){let t=e.trim().toLowerCase();return t!==""&&t!=="false"&&t!=="0"}return Boolean(e)}
export{iSt,xKt,HEn,ibe,aSt,mJr,IKt};
