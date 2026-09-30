// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{X}from"/$bunfs/root/chunk-wjyya8wj.js";import{Bd,Rbe}from"/$bunfs/root/chunk-gph9jdam.js";import{JIr,$Te,Tz,XWn}from"/$bunfs/root/chunk-zvtc1pbb.js";function GCt(){let n=Bd();return n?{entrypoint:n.toLowerCase().slice(0,64)}:{}}function $Dn(){let n=JIr();return n&&!Rbe()?{session_id:n}:{}}var u=3600000;function E7t(){let n=X().sessionHintsRefusedAt;if(n!==void 0&&Date.now()-n<u)return{};return{...GCt(),...$Dn()}}function k7t(){X().sessionHintsRefusedAt=Date.now()}var FDn=["entrypoint","session_id","request_id"],d=new Set(FDn);function T7t(n,s,i){let o=FDn.filter((t)=>i[t]!==void 0);if(n!==400||o.length===0)return[];let e=Tz(s);if(!$Te.test(e))return[];let r=o.filter((t)=>XWn(e,t));if(r.length>0)return r;return Object.keys(i).some((t)=>!d.has(t)&&XWn(e,t))?[]:o}function VCt(n){return n.includes("entrypoint")||n.includes("session_id")}function bpo(n){let{entrypoint:s,session_id:i,request_id:o,...e}=n;return e}
export{GCt,$Dn,E7t,k7t,FDn,T7t,VCt,bpo};
