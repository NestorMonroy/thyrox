// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Ai,Fo}from"/$bunfs/root/chunk-35k7s716.js";import{dL,mIe,NSt,eM,iF,Fk}from"/$bunfs/root/chunk-4n4g22z6.js";import{$r}from"/$bunfs/root/chunk-xe0dn6dd.js";import{realpathSync as u}from"fs";var Ece=(()=>{try{return u(process.cwd())}catch{return process.cwd()}})();function nwn(r,e){let n=dL(r),t=dL(e);if(eM(n)||eM(t))return!0;if(n.skipped!==t.skipped)return!0;return mIe(n,t)}function lxe(r,e){if(Fo(r)||Ai(r))return[];let n=$r(r),t=n!==null&&n!==void 0?[n]:(()=>{let o=Fk(r);return o.length>0?o:[r]})();return e===void 0?t:t.filter((o)=>iF(o,e)!=="same")}function zBe(r,e){if(Fo(r)||Ai(r))return[];let n=$r(r),t=n!==null&&n!==void 0?[n]:Fk(r);return e===void 0?t:t.filter((s)=>iF(s,e)!=="same")}function Qye(r,e,n){if(e.length===0)return!1;if(!e.every((s)=>{let o=iF(r,s);if(o==="indeterminate")return!1;if(o==="same")return!0;return!nwn(s,r)}))return!1;if(n?.requireCovered===!0){let s=dL(r);if(eM(s))return!1;let o=(a)=>a.some((c)=>{let i=dL(c);if(eM(i))return!1;return NSt(s,i)});return o(n.coveredWitnesses??e)||o(n.extraCoveredRoots??[])}return!0}
export{Ece,nwn,lxe,zBe,Qye};
