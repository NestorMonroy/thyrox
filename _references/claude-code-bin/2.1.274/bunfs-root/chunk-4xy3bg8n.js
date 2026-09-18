// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{W,Hd}from"/$bunfs/root/chunk-ja309z9r.js";import{WC}from"/$bunfs/root/chunk-m0am9fba.js";import{Et,I}from"/$bunfs/root/chunk-27bj2wbx.js";function Fst(){return WC("autoContinueAtUsageLimit")[0]}function Y0t(e){return Fst()??e==="absent"}var i="tengu_marble_heron";function utn(){let e=n();return o(e)?e:{}}function Lue(){let e=n();return r(o(e)?e.enabled:e)}function Ust(){return Hd()&&!Et()}function bkr(){return Ust()&&Lue()}function X0t(){return r(utn().autoArm)}function n(){return I(i,{})}function o(e){return typeof e==="object"&&e!==null&&!Array.isArray(e)}function r(e){if(e===void 0)return!0;if(typeof e==="string"){let t=e.trim().toLowerCase();return t!==""&&t!=="false"&&t!=="0"}return Boolean(e)}var Bst=86400000;function CU(e){return e.status==="rejected"&&e.resetsAt!==void 0&&Number.isFinite(e.resetsAt)&&e.isUsingOverage!==!0&&e.overageInUse!==!0}class u{#e=null;get provided(){return this.#e!==null}provide(e){this.#e=e}hasIntent(){return this.#e?.()??!1}}var J0t=new W(()=>new u);
export{Fst,Y0t,utn,Lue,Ust,bkr,X0t,Bst,CU,J0t};
