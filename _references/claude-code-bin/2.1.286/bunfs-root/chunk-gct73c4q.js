// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{l}from"/$bunfs/root/chunk-ctczby4m.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{R}from"/$bunfs/root/chunk-4hjp8tw4.js";import{EUe,e1r}from"/$bunfs/root/chunk-xepp7y7w.js";import{gl,qPr}from"/$bunfs/root/chunk-q6jg9kg6.js";import{ude}from"/$bunfs/root/chunk-hkq3hb4m.js";import{nEt}from"/$bunfs/root/chunk-4jnmpg1m.js";function Yar(){if(!qPr())return"off";try{return R("tengu_vast_tulip",!1)===!0?"enforce":"observe"}catch{return t("tool host attestation: reading tengu_vast_tulip threw; observing",{level:"warn"}),"observe"}}function s(e){let o=ude(),{status:r,meetsLevel:n,configException:i}=e1r(e,o,{isCloudWorker:!1});return{status:r,verdict:!o.enforce?"not_policed":n?"pass":i?"config_exception":"below_floor"}}function Jwe(e){let o=Yar();return o==="off"?void 0:{mode:o,...s(EUe(e))}}function LMe(e){return e?.mode==="enforce"&&e.verdict==="below_floor"}function b3t(){let e=Jwe("UNSPECIFIED");return{attestation:e,heldBack:LMe(e)}}function hoo(e){try{e?.(nEt,gl["repository_trust.served_calls.unattested"])}catch(o){t(`[remote-tools] the notice sink threw on ${nEt}: ${l(o)}`,{level:"error"})}}
export{Yar,Jwe,LMe,b3t,hoo};
