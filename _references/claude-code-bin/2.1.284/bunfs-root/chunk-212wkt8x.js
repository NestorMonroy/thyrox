// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ve}from"/$bunfs/root/chunk-d37h8mav.js";import{bG}from"/$bunfs/root/chunk-k5ve27rw.js";import{AsyncLocalStorage as t}from"async_hooks";var Jit="X-CCR-Turn-Id",o=128,u=/^[\x21-\x7e]+$/,i=new t;function rvo(e,n){return i.run({id:e},n)}function zOt(){return i.getStore()?.id}function VOt(){let e=i.getStore();if(e)e.id=void 0}function Qit(e){let n=zOt();if(n===void 0)return;if(e.some((r)=>r.ccrTurnId!==n))VOt()}function z1n(e,{isRelayHuman:n}){if(!n)return;if(typeof e!=="object"||e===null||!("turn_id"in e))return;let r=e.turn_id;if(typeof r!=="string"||r===""||r.length>o||!u.test(r))return;return r}function qOt(e){if(e.length>0)VOt()}function ovo(e){let n=e[0]?.ccrTurnId;return e.every((r)=>r.ccrTurnId===n)?n:void 0}function svo(e,n){return e!==void 0&&e.mode==="poll-event"&&e.pollEvent?.wake===!0&&!n}function V1n(e){return e==="prompt"||e==="orphaned-permission"||e==="task-notification"||e==="poll-event"}function mc(e){return e.agentId===Ve()}var ivo={kind:"task-notification",source:"goal-checkin"};function Jrn(e){return e.origin?.kind==="task-notification"&&e.origin.source==="goal-checkin"}var avo={kind:"task-notification",source:"worker-checkin"};function A4e(e){return e.origin?.kind==="task-notification"&&(e.origin.source==="goal-checkin"||e.origin.source==="worker-checkin")}function Zit(e){return mc(e)&&e.mode==="task-notification"}function KOt(e){let n=e.queueOrigin??e.origin;return A4e({origin:n})?bG(n):n}function $Cr(e){return e.queueMode??d(KOt(e))}function eat(e){return e.queueSkipAttachments===!0||$Cr(e)==="task-notification"?!0:void 0}function d(e){return e?.kind==="task-notification"?"task-notification":"prompt"}
export{Jit,rvo,zOt,VOt,Qit,z1n,qOt,ovo,svo,V1n,mc,ivo,Jrn,avo,A4e,Zit,KOt,$Cr,eat};
