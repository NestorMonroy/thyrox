// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{qe}from"/$bunfs/root/chunk-zwm3fybx.js";import{xj}from"/$bunfs/root/chunk-p6ftsfpp.js";var CY=300000,kj=3600000;import{AsyncLocalStorage as t}from"async_hooks";var rnt="X-CCR-Turn-Id",o=128,u=/^[\x21-\x7e]+$/,i=new t;function blo(e,n){return i.run({id:e},n)}function tCt(){return i.getStore()?.id}function nCt(){let e=i.getStore();if(e)e.id=void 0}function ont(e){let n=tCt();if(n===void 0)return;if(e.some((r)=>r.ccrTurnId!==n))nCt()}function B0n(e,{isRelayHuman:n}){if(!n)return;if(typeof e!=="object"||e===null||!("turn_id"in e))return;let r=e.turn_id;if(typeof r!=="string"||r===""||r.length>o||!u.test(r))return;return r}function rCt(e){if(e.length>0)nCt()}function Slo(e){let n=e[0]?.ccrTurnId;return e.every((r)=>r.ccrTurnId===n)?n:void 0}function wlo(e,n){return e!==void 0&&e.mode==="poll-event"&&e.pollEvent?.wake===!0&&!n}function j0n(e){return e==="prompt"||e==="orphaned-permission"||e==="task-notification"||e==="poll-event"}function Xl(e){return e.agentId===qe()}var vlo={kind:"task-notification",source:"goal-checkin"};function $Jt(e){return e.origin?.kind==="task-notification"&&e.origin.source==="goal-checkin"}var Elo={kind:"task-notification",source:"worker-checkin"};function g2e(e){return e.origin?.kind==="task-notification"&&(e.origin.source==="goal-checkin"||e.origin.source==="worker-checkin")}function snt(e){return Xl(e)&&e.mode==="task-notification"}function oCt(e){let n=e.queueOrigin??e.origin;return g2e({origin:n})?xj(n):n}function Vhr(e){return e.queueMode??d(oCt(e))}function int(e){return e.queueSkipAttachments===!0||Vhr(e)==="task-notification"?!0:void 0}function d(e){return e?.kind==="task-notification"?"task-notification":"prompt"}
export{CY,kj,rnt,blo,tCt,nCt,ont,B0n,rCt,Slo,wlo,j0n,Xl,vlo,$Jt,Elo,g2e,snt,oCt,Vhr,int};
