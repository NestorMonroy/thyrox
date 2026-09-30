// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{In,eA,Re}from"/$bunfs/root/chunk-z0202m3z.js";import{Uu}from"/$bunfs/root/chunk-r2c9k9kh.js";import{F}from"/$bunfs/root/chunk-p7hrkaq4.js";import{$u}from"/$bunfs/root/chunk-hk70qp2z.js";import{jp}from"/$bunfs/root/chunk-pc40tvt4.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function D3e(e){return(n)=>e.hostFiles.realPath(Uu.workspace(n===""||g(n)?n:l(n)),{native:!0})}function yg(e){return e===void 0?void 0:{hoverRestOn:F(),realPath:D3e(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function mp(e,n){if(!F()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==$u())return;let r=c(t),o=c(e,".jsonl");if(e!==p($u(),r,`${o}.jsonl`))return;let i=Re.transcript(r,o);return jp(i)===void 0?{backend:n,key:i}:void 0}function NLr(e,n){if(!F()||n===void 0)return;let t=m($u(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p($u(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!eA([r[0],r[1],i])||d.length>0&&!eA(d))return;let s=Re.transcript(r[0],r[1],i,d.length>0?d:void 0);return jp(s)===void 0?{backend:n,key:s}:void 0}function yB(e){if(!F()||e===void 0)return;return{backend:e,transcriptKey:Re.transcript,isKeySegment:In,realWorkspacePath:D3e(e)}}function Ob(e){return e===void 0?void 0:{source:e,hoverRestOn:F()}}
export{D3e,yg,mp,NLr,yB,Ob};
