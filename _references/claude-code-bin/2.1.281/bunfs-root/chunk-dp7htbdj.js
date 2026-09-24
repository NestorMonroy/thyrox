// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{qe}from"/$bunfs/root/chunk-cqc88nqm.js";import{J1}from"/$bunfs/root/chunk-5542tk4a.js";function Ino(e,n){return e!==void 0&&e.mode==="poll-event"&&e.pollEvent?.wake===!0&&!n}function NIn(e){return e==="prompt"||e==="orphaned-permission"||e==="task-notification"||e==="poll-event"}function rc(e){return e.agentId===qe()}var Pno={kind:"task-notification",source:"goal-checkin"};function ZYt(e){return e.origin?.kind==="task-notification"&&e.origin.source==="goal-checkin"}var Hno={kind:"task-notification",source:"worker-checkin"};function H2e(e){return e.origin?.kind==="task-notification"&&(e.origin.source==="goal-checkin"||e.origin.source==="worker-checkin")}function net(e){return rc(e)&&e.mode==="task-notification"}function bkt(e){let n=e.queueOrigin??e.origin;return H2e({origin:n})?J1(n):n}function Uur(e){return e.queueMode??t(bkt(e))}function ret(e){return e.queueSkipAttachments===!0||Uur(e)==="task-notification"?!0:void 0}function t(e){return e?.kind==="task-notification"?"task-notification":"prompt"}var Sue=300000,aK=3600000;import{AsyncLocalStorage as o}from"async_hooks";var oet="X-CCR-Turn-Id",u=128,d=/^[\x21-\x7e]+$/,i=new o;function Ono(e,n){return i.run({id:e},n)}function Skt(){return i.getStore()?.id}function wkt(){let e=i.getStore();if(e)e.id=void 0}function set(e){let n=Skt();if(n===void 0)return;if(e.some((r)=>r.ccrTurnId!==n))wkt()}function $In(e,{isRelayHuman:n}){if(!n)return;if(typeof e!=="object"||e===null||!("turn_id"in e))return;let r=e.turn_id;if(typeof r!=="string"||r===""||r.length>u||!d.test(r))return;return r}function vkt(e){if(e.length>0)wkt()}function Mno(e){let n=e[0]?.ccrTurnId;return e.every((r)=>r.ccrTurnId===n)?n:void 0}
export{Ino,NIn,rc,Pno,ZYt,Hno,H2e,net,bkt,Uur,ret,Sue,aK,oet,Ono,Skt,wkt,set,$In,vkt,Mno};
