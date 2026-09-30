// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{jn,sR,Re}from"/$bunfs/root/chunk-qbkceaaj.js";import{N}from"/$bunfs/root/chunk-8nz62976.js";import{zu}from"/$bunfs/root/chunk-wf6ne59j.js";import{Vu}from"/$bunfs/root/chunk-zkn0228z.js";import{em}from"/$bunfs/root/chunk-m8ebe51k.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function Sst(e){return(n)=>e.hostFiles.realPath(Vu.workspace(n===""||g(n)?n:l(n)),{native:!0})}function Ag(e){return e===void 0?void 0:{hoverRestOn:N(),realPath:Sst(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function Ff(e,n){if(!N()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==zu())return;let r=c(t),o=c(e,".jsonl");if(e!==p(zu(),r,`${o}.jsonl`))return;let i=Re.transcript(r,o);return em(i)===void 0?{backend:n,key:i}:void 0}function o_o(e,n){if(!N()||n===void 0)return;let t=m(zu(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(zu(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!sR([r[0],r[1],i])||d.length>0&&!sR(d))return;let s=Re.transcript(r[0],r[1],i,d.length>0?d:void 0);return em(s)===void 0?{backend:n,key:s}:void 0}function uV(e){if(!N()||e===void 0)return;return{backend:e,transcriptKey:Re.transcript,isKeySegment:jn,realWorkspacePath:Sst(e)}}function lv(e){return e===void 0?void 0:{source:e,hoverRestOn:N()}}
export{Sst,Ag,Ff,o_o,uV,lv};
