// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{l}from"/$bunfs/root/chunk-31aa9k3a.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{x}from"/$bunfs/root/chunk-swk3rjnt.js";import{SFe,N$r}from"/$bunfs/root/chunk-p38es2mj.js";import{Hce}from"/$bunfs/root/chunk-saaygt9v.js";import{ewt}from"/$bunfs/root/chunk-tcmzsyy1.js";import{ua,eIr}from"/$bunfs/root/chunk-45s965ek.js";function qor(){if(!eIr())return"off";try{return x("tengu_vast_tulip",!1)===!0?"enforce":"observe"}catch{return t("tool host attestation: reading tengu_vast_tulip threw; observing",{level:"warn"}),"observe"}}function s(e){let o=Hce(),{status:r,meetsLevel:n,configException:i}=N$r(e,o,{isCloudWorker:!1});return{status:r,verdict:!o.enforce?"not_policed":n?"pass":i?"config_exception":"below_floor"}}function HOe(e){let o=qor();return o==="off"?void 0:{mode:o,...s(SFe(e))}}function MOe(e){return e?.mode==="enforce"&&e.verdict==="below_floor"}function eGe(){let e=HOe("UNSPECIFIED");return{attestation:e,heldBack:MOe(e)}}function g4t(e){try{e?.(ewt,ua["repository_trust.served_calls.unattested"])}catch(o){t(`[remote-tools] the notice sink threw on ${ewt}: ${l(o)}`,{level:"error"})}}
export{qor,HOe,MOe,eGe,g4t};
