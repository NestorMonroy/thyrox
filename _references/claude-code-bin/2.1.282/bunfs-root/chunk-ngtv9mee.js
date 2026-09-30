// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Nn,IC,Re}from"/$bunfs/root/chunk-z3ns4mz4.js";import{N}from"/$bunfs/root/chunk-hm6k4hcw.js";import{Qu}from"/$bunfs/root/chunk-g59nc6ra.js";import{np}from"/$bunfs/root/chunk-nbcqw6vp.js";import{Nf}from"/$bunfs/root/chunk-36kx407g.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function $nt(e){return(n)=>e.hostFiles.realPath(np.workspace(n===""||g(n)?n:l(n)),{native:!0})}function cg(e){return e===void 0?void 0:{hoverRestOn:N(),realPath:$nt(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function Af(e,n){if(!N()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==Qu())return;let r=c(t),o=c(e,".jsonl");if(e!==p(Qu(),r,`${o}.jsonl`))return;let i=Re.transcript(r,o);return Nf(i)===void 0?{backend:n,key:i}:void 0}function edo(e,n){if(!N()||n===void 0)return;let t=m(Qu(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(Qu(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!IC([r[0],r[1],i])||d.length>0&&!IC(d))return;let s=Re.transcript(r[0],r[1],i,d.length>0?d:void 0);return Nf(s)===void 0?{backend:n,key:s}:void 0}function LG(e){if(!N()||e===void 0)return;return{backend:e,transcriptKey:Re.transcript,isKeySegment:Nn,realWorkspacePath:$nt(e)}}function Dw(e){return e===void 0?void 0:{source:e,hoverRestOn:N()}}
export{$nt,cg,Af,edo,LG,Dw};
