// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{l}from"/$bunfs/root/chunk-ern0s5ks.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{x}from"/$bunfs/root/chunk-t6pwageh.js";import{s$e,O0r}from"/$bunfs/root/chunk-1z8q3f24.js";import{jle}from"/$bunfs/root/chunk-qpkt5f7c.js";import{rbt}from"/$bunfs/root/chunk-z03vy65b.js";import{Mi,UCr}from"/$bunfs/root/chunk-5t3x93y6.js";function Ptr(){if(!UCr())return"off";try{return x("tengu_vast_tulip",!1)===!0?"enforce":"observe"}catch{return t("tool host attestation: reading tengu_vast_tulip threw; observing",{level:"warn"}),"observe"}}function s(e){let o=jle(),{status:r,meetsLevel:n,configException:i}=O0r(e,o,{isCloudWorker:!1});return{status:r,verdict:!o.enforce?"not_policed":n?"pass":i?"config_exception":"below_floor"}}function EPe(e){let o=Ptr();return o==="off"?void 0:{mode:o,...s(s$e(e))}}function kPe(e){return e?.mode==="enforce"&&e.verdict==="below_floor"}function Fje(){let e=EPe("UNSPECIFIED");return{attestation:e,heldBack:kPe(e)}}function KVt(e){try{e?.(rbt,Mi["repository_trust.served_calls.unattested"])}catch(o){t(`[remote-tools] the notice sink threw on ${rbt}: ${l(o)}`,{level:"error"})}}
export{Ptr,EPe,kPe,Fje,KVt};
