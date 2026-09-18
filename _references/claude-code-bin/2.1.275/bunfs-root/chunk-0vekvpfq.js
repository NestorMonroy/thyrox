// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Dn,vA,Re}from"/$bunfs/root/chunk-vtbas3eg.js";import{Xu}from"/$bunfs/root/chunk-4bbpt7sc.js";import{F}from"/$bunfs/root/chunk-h401nbms.js";import{Vu}from"/$bunfs/root/chunk-g8rhxhbp.js";import{Qp}from"/$bunfs/root/chunk-4m9qp5rm.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function T5e(e){return(n)=>e.hostFiles.realPath(Xu.workspace(n===""||g(n)?n:l(n)),{native:!0})}function xg(e){return e===void 0?void 0:{hoverRestOn:F(),realPath:T5e(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function vp(e,n){if(!F()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==Vu())return;let r=c(t),o=c(e,".jsonl");if(e!==p(Vu(),r,`${o}.jsonl`))return;let i=Re.transcript(r,o);return Qp(i)===void 0?{backend:n,key:i}:void 0}function aBr(e,n){if(!F()||n===void 0)return;let t=m(Vu(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(Vu(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!vA([r[0],r[1],i])||d.length>0&&!vA(d))return;let s=Re.transcript(r[0],r[1],i,d.length>0?d:void 0);return Qp(s)===void 0?{backend:n,key:s}:void 0}function XB(e){if(!F()||e===void 0)return;return{backend:e,transcriptKey:Re.transcript,isKeySegment:Dn,realWorkspacePath:T5e(e)}}function Wb(e){return e===void 0?void 0:{source:e,hoverRestOn:F()}}
export{T5e,xg,vp,aBr,XB,Wb};
