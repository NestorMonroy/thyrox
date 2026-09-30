// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{_n,bv,ke}from"/$bunfs/root/chunk-4te7e7q8.js";import{N}from"/$bunfs/root/chunk-m3k3498d.js";import{Ac}from"/$bunfs/root/chunk-fy3j7rz0.js";import{Ec}from"/$bunfs/root/chunk-dm1d67j0.js";import{Ld}from"/$bunfs/root/chunk-zw6xpj0e.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function RFe(e){return(n)=>e.hostFiles.realPath(Ac.workspace(n===""||g(n)?n:l(n)),{native:!0})}function Kf(e){return e===void 0?void 0:{hoverRestOn:N(),realPath:RFe(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function ku(e,n){if(!N()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==Ec())return;let r=c(t),o=c(e,".jsonl");if(e!==p(Ec(),r,`${o}.jsonl`))return;let i=ke.transcript(r,o);return Ld(i)===void 0?{backend:n,key:i}:void 0}function qer(e,n){if(!N()||n===void 0)return;let t=m(Ec(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(Ec(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!bv([r[0],r[1],i])||d.length>0&&!bv(d))return;let s=ke.transcript(r[0],r[1],i,d.length>0?d:void 0);return Ld(s)===void 0?{backend:n,key:s}:void 0}function rN(e){if(!N()||e===void 0)return;return{backend:e,transcriptKey:ke.transcript,isKeySegment:_n,realWorkspacePath:RFe(e)}}function ty(e){return e===void 0?void 0:{source:e,hoverRestOn:N()}}
export{RFe,Kf,ku,qer,rN,ty};
