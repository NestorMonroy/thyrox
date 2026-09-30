// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{qe}from"/$bunfs/root/chunk-nvht7ckf.js";import{XW}from"/$bunfs/root/chunk-ajb1xz1h.js";var l9=300000,MD=3600000;import{AsyncLocalStorage as t}from"async_hooks";var Est="X-CCR-Turn-Id",o=128,u=/^[\x21-\x7e]+$/,i=new t;function s_o(e,n){return i.run({id:e},n)}function FIt(){return i.getStore()?.id}function UIt(){let e=i.getStore();if(e)e.id=void 0}function kst(e){let n=FIt();if(n===void 0)return;if(e.some((r)=>r.ccrTurnId!==n))UIt()}function IFn(e,{isRelayHuman:n}){if(!n)return;if(typeof e!=="object"||e===null||!("turn_id"in e))return;let r=e.turn_id;if(typeof r!=="string"||r===""||r.length>o||!u.test(r))return;return r}function BIt(e){if(e.length>0)UIt()}function i_o(e){let n=e[0]?.ccrTurnId;return e.every((r)=>r.ccrTurnId===n)?n:void 0}function a_o(e,n){return e!==void 0&&e.mode==="poll-event"&&e.pollEvent?.wake===!0&&!n}function PFn(e){return e==="prompt"||e==="orphaned-permission"||e==="task-notification"||e==="poll-event"}function cc(e){return e.agentId===qe()}var l_o={kind:"task-notification",source:"goal-checkin"};function Ttn(e){return e.origin?.kind==="task-notification"&&e.origin.source==="goal-checkin"}var c_o={kind:"task-notification",source:"worker-checkin"};function eKe(e){return e.origin?.kind==="task-notification"&&(e.origin.source==="goal-checkin"||e.origin.source==="worker-checkin")}function Tst(e){return cc(e)&&e.mode==="task-notification"}function jIt(e){let n=e.queueOrigin??e.origin;return eKe({origin:n})?XW(n):n}function pkr(e){return e.queueMode??d(jIt(e))}function Ast(e){return e.queueSkipAttachments===!0||pkr(e)==="task-notification"?!0:void 0}function d(e){return e?.kind==="task-notification"?"task-notification":"prompt"}
export{l9,MD,Est,s_o,FIt,UIt,kst,IFn,BIt,i_o,a_o,PFn,cc,l_o,Ttn,c_o,eKe,Tst,jIt,pkr,Ast};
