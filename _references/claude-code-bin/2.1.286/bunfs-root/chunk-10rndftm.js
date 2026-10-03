// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Y}from"/$bunfs/root/chunk-bwk92a53.js";import{Xd,CSe}from"/$bunfs/root/chunk-wk88sc60.js";import{BLr,ZAe,JL,Qqn}from"/$bunfs/root/chunk-r9av03yp.js";function Nxt(){let n=Xd();return n?{entrypoint:n.toLowerCase().slice(0,64)}:{}}function TNn(){let n=BLr();return n&&!CSe()?{session_id:n}:{}}var u=3600000;function GZt(){let n=Y().sessionHintsRefusedAt;if(n!==void 0&&Date.now()-n<u)return{};return{...Nxt(),...TNn()}}function VZt(){Y().sessionHintsRefusedAt=Date.now()}var ANn=["entrypoint","session_id","request_id"],d=new Set(ANn);function qZt(n,s,i){let o=ANn.filter((t)=>i[t]!==void 0);if(n!==400||o.length===0)return[];let e=JL(s);if(!ZAe.test(e))return[];let r=o.filter((t)=>Qqn(e,t));if(r.length>0)return r;return Object.keys(i).some((t)=>!d.has(t)&&Qqn(e,t))?[]:o}function $xt(n){return n.includes("entrypoint")||n.includes("session_id")}function Rho(n){let{entrypoint:s,session_id:i,request_id:o,...e}=n;return e}
export{Nxt,TNn,GZt,VZt,ANn,qZt,$xt,Rho};
