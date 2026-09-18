// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{qi,as}from"/$bunfs/root/chunk-g5h2a16k.js";import{lO,Owe,Aat,iH,GD,Bv}from"/$bunfs/root/chunk-ayyj05ne.js";import{Yr}from"/$bunfs/root/chunk-pc40tvt4.js";import{realpathSync as u}from"fs";var $ne=(()=>{try{return u(process.cwd())}catch{return process.cwd()}})();function BZt(r,e){let n=lO(r),t=lO(e);if(iH(n)||iH(t))return!0;if(n.skipped!==t.skipped)return!0;return Owe(n,t)}function vSe(r,e){if(as(r)||qi(r))return[];let n=Yr(r),t=n!==null&&n!==void 0?[n]:(()=>{let o=Bv(r);return o.length>0?o:[r]})();return e===void 0?t:t.filter((o)=>GD(o,e)!=="same")}function GHe(r,e){if(as(r)||qi(r))return[];let n=Yr(r),t=n!==null&&n!==void 0?[n]:Bv(r);return e===void 0?t:t.filter((s)=>GD(s,e)!=="same")}function Eue(r,e,n){if(e.length===0)return!1;if(!e.every((s)=>{let o=GD(r,s);if(o==="indeterminate")return!1;if(o==="same")return!0;return!BZt(s,r)}))return!1;if(n?.requireCovered===!0){let s=lO(r);if(iH(s))return!1;let o=(a)=>a.some((c)=>{let i=lO(c);if(iH(i))return!1;return Aat(s,i)});return o(n.coveredWitnesses??e)||o(n.extraCoveredRoots??[])}return!0}
export{$ne,BZt,vSe,GHe,Eue};
