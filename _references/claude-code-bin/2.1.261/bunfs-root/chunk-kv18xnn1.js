// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{yn,FH,Ae}from"/$bunfs/root/chunk-y87vtd8k.js";import{O}from"/$bunfs/root/chunk-x7f60hk6.js";import{bc}from"/$bunfs/root/chunk-y5pwxex8.js";import{_c}from"/$bunfs/root/chunk-1a7p190e.js";import{Cd}from"/$bunfs/root/chunk-hsewrfs2.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function gOe(e){return(n)=>e.hostFiles.realPath(bc.workspace(n===""||g(n)?n:l(n)),{native:!0})}function Ip(e){return e===void 0?void 0:{hoverRestOn:O(),realPath:gOe(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function gu(e,n){if(!O()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==_c())return;let r=c(t),o=c(e,".jsonl");if(e!==p(_c(),r,`${o}.jsonl`))return;let i=Ae.transcript(r,o);return Cd(i)===void 0?{backend:n,key:i}:void 0}function VXn(e,n){if(!O()||n===void 0)return;let t=m(_c(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(_c(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!FH([r[0],r[1],i])||d.length>0&&!FH(d))return;let s=Ae.transcript(r[0],r[1],i,d.length>0?d:void 0);return Cd(s)===void 0?{backend:n,key:s}:void 0}function JM(e){if(!O()||e===void 0)return;return{backend:e,transcriptKey:Ae.transcript,isKeySegment:yn,realWorkspacePath:gOe(e)}}function $h(e){return e===void 0?void 0:{source:e,hoverRestOn:O()}}
export{gOe,Ip,gu,VXn,JM,$h};
