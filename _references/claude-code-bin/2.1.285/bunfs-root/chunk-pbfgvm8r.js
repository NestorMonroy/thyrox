// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{l}from"/$bunfs/root/chunk-vqpmen5t.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{x}from"/$bunfs/root/chunk-f74xvn8g.js";import{sFe,O$r}from"/$bunfs/root/chunk-r0pwrj0s.js";import{fc,VHr}from"/$bunfs/root/chunk-9v35ka7v.js";import{Oce}from"/$bunfs/root/chunk-pq48427s.js";import{lwt}from"/$bunfs/root/chunk-6srfw2e5.js";function rsr(){if(!VHr())return"off";try{return x("tengu_vast_tulip",!1)===!0?"enforce":"observe"}catch{return t("tool host attestation: reading tengu_vast_tulip threw; observing",{level:"warn"}),"observe"}}function s(e){let o=Oce(),{status:r,meetsLevel:n,configException:i}=O$r(e,o,{isCloudWorker:!1});return{status:r,verdict:!o.enforce?"not_policed":n?"pass":i?"config_exception":"below_floor"}}function owe(e){let o=rsr();return o==="off"?void 0:{mode:o,...s(sFe(e))}}function IOe(e){return e?.mode==="enforce"&&e.verdict==="below_floor"}function u4t(){let e=owe("UNSPECIFIED");return{attestation:e,heldBack:IOe(e)}}function $eo(e){try{e?.(lwt,fc["repository_trust.served_calls.unattested"])}catch(o){t(`[remote-tools] the notice sink threw on ${lwt}: ${l(o)}`,{level:"error"})}}
export{rsr,owe,IOe,u4t,$eo};
