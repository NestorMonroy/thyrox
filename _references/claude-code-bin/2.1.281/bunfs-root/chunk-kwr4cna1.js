// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Mn,pC,Re}from"/$bunfs/root/chunk-99avamm5.js";import{F}from"/$bunfs/root/chunk-7yckkh1m.js";import{Eu}from"/$bunfs/root/chunk-cqpd6xa9.js";import{ju}from"/$bunfs/root/chunk-wfscmafr.js";import{Df}from"/$bunfs/root/chunk-xe0dn6dd.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function Fet(e){return(n)=>e.hostFiles.realPath(ju.workspace(n===""||g(n)?n:l(n)),{native:!0})}function ng(e){return e===void 0?void 0:{hoverRestOn:F(),realPath:Fet(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function wf(e,n){if(!F()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==Eu())return;let r=c(t),o=c(e,".jsonl");if(e!==p(Eu(),r,`${o}.jsonl`))return;let i=Re.transcript(r,o);return Df(i)===void 0?{backend:n,key:i}:void 0}function doo(e,n){if(!F()||n===void 0)return;let t=m(Eu(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(Eu(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!pC([r[0],r[1],i])||d.length>0&&!pC(d))return;let s=Re.transcript(r[0],r[1],i,d.length>0?d:void 0);return Df(s)===void 0?{backend:n,key:s}:void 0}function cG(e){if(!F()||e===void 0)return;return{backend:e,transcriptKey:Re.transcript,isKeySegment:Mn,realWorkspacePath:Fet(e)}}function Tw(e){return e===void 0?void 0:{source:e,hoverRestOn:F()}}
export{Fet,ng,wf,doo,cG,Tw};
