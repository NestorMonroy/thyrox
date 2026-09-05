// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{sn,tf,ve}from"/$bunfs/root/chunk-ptdm1fhw.js";import{M}from"/$bunfs/root/chunk-56nvyfje.js";import{du}from"/$bunfs/root/chunk-fzpv8ev5.js";import{da}from"/$bunfs/root/chunk-vdqz95a3.js";import{zn}from"/$bunfs/root/chunk-nwzn6gxv.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function _Ne(e){return(n)=>e.hostFiles.realPath(du.workspace(n===""||g(n)?n:l(n)),{native:!0})}function Uu(e){return e===void 0?void 0:{hoverRestOn:M(),realPath:_Ne(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function pl(e,n){if(!M()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==da())return;let r=c(t),o=c(e,".jsonl");if(e!==p(da(),r,`${o}.jsonl`))return;let i=ve.transcript(r,o);return zn(i)===void 0?{backend:n,key:i}:void 0}function VZn(e,n){if(!M()||n===void 0)return;let t=m(da(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(da(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!tf([r[0],r[1],i])||d.length>0&&!tf(d))return;let s=ve.transcript(r[0],r[1],i,d.length>0?d:void 0);return zn(s)===void 0?{backend:n,key:s}:void 0}function Xg(e){if(!M()||e===void 0)return;return{backend:e,transcriptKey:ve.transcript,isKeySegment:sn,realWorkspacePath:_Ne(e)}}function Au(e){return e===void 0?void 0:{source:e,hoverRestOn:M()}}
export{_Ne,Uu,pl,VZn,Xg,Au};
