// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Gn,DR,He}from"/$bunfs/root/chunk-1m79ycfm.js";import{L}from"/$bunfs/root/chunk-k3gp1qmc.js";import{Qu}from"/$bunfs/root/chunk-bgchm1w8.js";import{Du}from"/$bunfs/root/chunk-055ns4k8.js";import{tm}from"/$bunfs/root/chunk-a1fdkwrj.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function Wit(e){return(n)=>e.hostFiles.realPath(Du.workspace(n===""||g(n)?n:l(n)),{native:!0})}function Pw(e){return e===void 0?void 0:{hoverRestOn:L(),realPath:Wit(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function Wf(e,n){if(!L()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==Qu())return;let r=c(t),o=c(e,".jsonl");if(e!==p(Qu(),r,`${o}.jsonl`))return;let i=He.transcript(r,o);return tm(i)===void 0?{backend:n,key:i}:void 0}function cvo(e,n){if(!L()||n===void 0)return;let t=m(Qu(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(Qu(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!DR([r[0],r[1],i])||d.length>0&&!DR(d))return;let s=He.transcript(r[0],r[1],i,d.length>0?d:void 0);return tm(s)===void 0?{backend:n,key:s}:void 0}function j$(e){if(!L()||e===void 0)return;return{backend:e,transcriptKey:He.transcript,isKeySegment:Gn,realWorkspacePath:Wit(e)}}function Iv(e){return e===void 0?void 0:{source:e,hoverRestOn:L()}}
export{Wit,Pw,Wf,cvo,j$,Iv};
