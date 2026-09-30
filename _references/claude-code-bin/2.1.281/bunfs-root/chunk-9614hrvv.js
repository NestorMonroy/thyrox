// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{bG,GHn,Coe,uAt,IK,ize,IG,nR}from"/$bunfs/root/chunk-adsaemws.js";import{lstat as o}from"fs/promises";import{join as s}from"path";var Bht=1e5,ORe=104857600;function j$(e){return Coe(e)&&!e.includes("\\")&&!(IG()&&nR(e))&&!GHn(e)&&!uAt(e)}async function AKr(e,t){try{let i=await o(s(e,t),{bigint:!0});return{path:t,identity:i.ino===0n?null:`${i.dev}:${i.ino}`}}catch{return{path:t,identity:null}}}function CKr(e){let t=e.flatMap(({path:n,identity:r})=>r===null?[]:[{path:n,key:`${bG(n)}\x00${r}`}]),i=t.reduce((n,{key:r})=>n.set(r,(n.get(r)??0)+1),new Map);return new Set(t.filter(({key:n})=>(i.get(n)??0)>1).map(({path:n})=>n))}function RKr(e){return e.split("\x00").filter((t)=>t.length>2&&t[1]===" ").map((t)=>({tag:t[0]??"",path:t.slice(2)}))}async function S3(e,t,i,n=null){let r=await IK(e,t,i,n);return r.kind==="read"?{...ize(r.content),content:r.content,mode:r.mode}:null}
export{Bht,ORe,j$,AKr,CKr,RKr,S3};
