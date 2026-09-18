// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{G,Yd}from"/$bunfs/root/chunk-4qqe0nh4.js";import{gR}from"/$bunfs/root/chunk-v49f6nqy.js";import{Et,I}from"/$bunfs/root/chunk-xbd48fav.js";function Vat(){return gR("autoContinueAtUsageLimit")[0]}function $Dt(e){return Vat()??e==="absent"}var i="tengu_marble_heron";function Bon(){let e=n();return o(e)?e:{}}function Wde(){let e=n();return r(o(e)?e.enabled:e)}function Kat(){return Yd()&&!Et()}function qxr(){return Kat()&&Wde()}function FDt(){return r(Bon().autoArm)}function n(){return I(i,{})}function o(e){return typeof e==="object"&&e!==null&&!Array.isArray(e)}function r(e){if(e===void 0)return!0;if(typeof e==="string"){let t=e.trim().toLowerCase();return t!==""&&t!=="false"&&t!=="0"}return Boolean(e)}var Yat=86400000;function cB(e){return e.status==="rejected"&&e.resetsAt!==void 0&&Number.isFinite(e.resetsAt)&&e.isUsingOverage!==!0&&e.overageInUse!==!0}class u{#e=null;get provided(){return this.#e!==null}provide(e){this.#e=e}hasIntent(){return this.#e?.()??!1}}var UDt=new G(()=>new u);
export{Vat,$Dt,Bon,Wde,Kat,qxr,FDt,Yat,cB,UDt};
