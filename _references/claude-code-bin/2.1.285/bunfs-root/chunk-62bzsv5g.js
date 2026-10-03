// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Vi,gs}from"/$bunfs/root/chunk-actz3rxp.js";import{k$,yDe,RRt,tL,dB,GT}from"/$bunfs/root/chunk-qazw855w.js";import{ms}from"/$bunfs/root/chunk-a1fdkwrj.js";import{realpathSync as u}from"fs";var dfe=(()=>{try{return u(process.cwd())}catch{return process.cwd()}})();function rIn(r,e){let n=k$(r),t=k$(e);if(tL(n)||tL(t))return!0;if(n.skipped!==t.skipped)return!0;return yDe(n,t)}function EHe(r,e){if(gs(r)||Vi(r))return[];let n=ms(r),t=n!==null&&n!==void 0?[n]:(()=>{let o=GT(r);return o.length>0?o:[r]})();return e===void 0?t:t.filter((o)=>dB(o,e)!=="same")}function P2e(r,e){if(gs(r)||Vi(r))return[];let n=ms(r),t=n!==null&&n!==void 0?[n]:GT(r);return e===void 0?t:t.filter((s)=>dB(s,e)!=="same")}function Ywe(r,e,n){if(e.length===0)return!1;if(!e.every((s)=>{let o=dB(r,s);if(o==="indeterminate")return!1;if(o==="same")return!0;return!rIn(s,r)}))return!1;if(n?.requireCovered===!0){let s=k$(r);if(tL(s))return!1;let o=(a)=>a.some((c)=>{let i=k$(c);if(tL(i))return!1;return RRt(s,i)});return o(n.coveredWitnesses??e)||o(n.extraCoveredRoots??[])}return!0}
export{dfe,rIn,EHe,P2e,Ywe};
