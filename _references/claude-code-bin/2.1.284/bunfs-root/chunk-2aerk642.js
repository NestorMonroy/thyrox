// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{ee}from"/$bunfs/root/chunk-fhmcdk9y.js";import{Vd,Ibe}from"/$bunfs/root/chunk-2rw92xpq.js";import{OMr,MAe,Eq,H2n}from"/$bunfs/root/chunk-v3pthsdx.js";function tRt(){let n=Vd();return n?{entrypoint:n.toLowerCase().slice(0,64)}:{}}function dDn(){let n=OMr();return n&&!Ibe()?{session_id:n}:{}}var u=3600000;function iQt(){let n=ee().sessionHintsRefusedAt;if(n!==void 0&&Date.now()-n<u)return{};return{...tRt(),...dDn()}}function aQt(){ee().sessionHintsRefusedAt=Date.now()}var uDn=["entrypoint","session_id","request_id"],d=new Set(uDn);function lQt(n,s,i){let o=uDn.filter((t)=>i[t]!==void 0);if(n!==400||o.length===0)return[];let e=Eq(s);if(!MAe.test(e))return[];let r=o.filter((t)=>H2n(e,t));if(r.length>0)return r;return Object.keys(i).some((t)=>!d.has(t)&&H2n(e,t))?[]:o}function nRt(n){return n.includes("entrypoint")||n.includes("session_id")}function vpo(n){let{entrypoint:s,session_id:i,request_id:o,...e}=n;return e}
export{tRt,dDn,iQt,aQt,uDn,lQt,nRt,vpo};
