// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{hT,NLn,Ise,GRt,l4,WVe,i2,hR}from"/$bunfs/root/chunk-ga02wneq.js";import{lstat as o}from"fs/promises";import{join as s}from"path";var $_t=1e5,rIe=104857600;function lF(e){return Ise(e)&&!e.includes("\\")&&!(i2()&&hR(e))&&!NLn(e)&&!GRt(e)}async function xYr(e,t){try{let i=await o(s(e,t),{bigint:!0});return{path:t,identity:i.ino===0n?null:`${i.dev}:${i.ino}`}}catch{return{path:t,identity:null}}}function IYr(e){let t=e.flatMap(({path:n,identity:r})=>r===null?[]:[{path:n,key:`${hT(n)}\x00${r}`}]),i=t.reduce((n,{key:r})=>n.set(r,(n.get(r)??0)+1),new Map);return new Set(t.filter(({key:n})=>(i.get(n)??0)>1).map(({path:n})=>n))}function PYr(e){return e.split("\x00").filter((t)=>t.length>2&&t[1]===" ").map((t)=>({tag:t[0]??"",path:t.slice(2)}))}async function l6(e,t,i,n=null){let r=await l4(e,t,i,n);return r.kind==="read"?{...WVe(r.content),content:r.content,mode:r.mode}:null}
export{$_t,rIe,lF,xYr,IYr,PYr,l6};
