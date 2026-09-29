// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{aq,dH,ZT,tGn,yle,mMt,d3,W5e}from"/$bunfs/root/chunk-45s965ek.js";import{lstat as o}from"fs/promises";import{join as s}from"path";var NEt=1e5,xHe=104857600;function BU(e){return yle(e)&&!e.includes("\\")&&!(aq()&&dH(e))&&!tGn(e)&&!mMt(e)}async function lso(e,t){try{let i=await o(s(e,t),{bigint:!0});return{path:t,identity:i.ino===0n?null:`${i.dev}:${i.ino}`}}catch{return{path:t,identity:null}}}function cso(e){let t=e.flatMap(({path:n,identity:r})=>r===null?[]:[{path:n,key:`${ZT(n)}\x00${r}`}]),i=t.reduce((n,{key:r})=>n.set(r,(n.get(r)??0)+1),new Map);return new Set(t.filter(({key:n})=>(i.get(n)??0)>1).map(({path:n})=>n))}function Fxn(e){return e.split("\x00").filter((t)=>t.length>2&&t[1]===" ").map((t)=>({tag:t[0]??"",path:t.slice(2)}))}async function v8(e,t,i,n=null){let r=await d3(e,t,i,n);return r.kind==="read"?{...W5e(r.content),content:r.content,mode:r.mode}:null}
export{NEt,xHe,BU,lso,cso,Fxn,v8};
