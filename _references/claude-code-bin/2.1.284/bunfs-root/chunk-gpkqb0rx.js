// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{zn,xR,xe}from"/$bunfs/root/chunk-h4npc7kp.js";import{N}from"/$bunfs/root/chunk-0pd7kjzx.js";import{rp}from"/$bunfs/root/chunk-6hfhp7ca.js";import{Lu}from"/$bunfs/root/chunk-6b6gfk00.js";import{rm}from"/$bunfs/root/chunk-hqy3a2gr.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function Kit(e){return(n)=>e.hostFiles.realPath(Lu.workspace(n===""||g(n)?n:l(n)),{native:!0})}function Ng(e){return e===void 0?void 0:{hoverRestOn:N(),realPath:Kit(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function Wf(e,n){if(!N()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==rp())return;let r=c(t),o=c(e,".jsonl");if(e!==p(rp(),r,`${o}.jsonl`))return;let i=xe.transcript(r,o);return rm(i)===void 0?{backend:n,key:i}:void 0}function nvo(e,n){if(!N()||n===void 0)return;let t=m(rp(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(rp(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!xR([r[0],r[1],i])||d.length>0&&!xR(d))return;let s=xe.transcript(r[0],r[1],i,d.length>0?d:void 0);return rm(s)===void 0?{backend:n,key:s}:void 0}function jV(e){if(!N()||e===void 0)return;return{backend:e,transcriptKey:xe.transcript,isKeySegment:zn,realWorkspacePath:Kit(e)}}function Tv(e){return e===void 0?void 0:{source:e,hoverRestOn:N()}}
export{Kit,Ng,Wf,nvo,jV,Tv};
