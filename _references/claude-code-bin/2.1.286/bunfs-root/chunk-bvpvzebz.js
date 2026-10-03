// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{qn,XR,Me}from"/$bunfs/root/chunk-hd8cteey.js";import{F}from"/$bunfs/root/chunk-616rkgbc.js";import{ap}from"/$bunfs/root/chunk-ky4en5r8.js";import{Bu}from"/$bunfs/root/chunk-6w550002.js";import{hm}from"/$bunfs/root/chunk-dsxed40r.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function Bct(e){return(n)=>e.hostFiles.realPath(Bu.workspace(n===""||g(n)?n:l(n)),{native:!0})}function qw(e){return e===void 0?void 0:{hoverRestOn:F(),realPath:Bct(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function nm(e,n){if(!F()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==ap())return;let r=c(t),o=c(e,".jsonl");if(e!==p(ap(),r,`${o}.jsonl`))return;let i=Me.transcript(r,o);return hm(i)===void 0?{backend:n,key:i}:void 0}function mIo(e,n){if(!F()||n===void 0)return;let t=m(ap(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(ap(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!XR([r[0],r[1],i])||d.length>0&&!XR(d))return;let s=Me.transcript(r[0],r[1],i,d.length>0?d:void 0);return hm(s)===void 0?{backend:n,key:s}:void 0}function SF(e){if(!F()||e===void 0)return;return{backend:e,transcriptKey:Me.transcript,isKeySegment:qn,realWorkspacePath:Bct(e)}}function Yv(e){return e===void 0?void 0:{source:e,hoverRestOn:F()}}
export{Bct,qw,nm,mIo,SF,Yv};
