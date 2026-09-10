// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{rn,Gd,Ae}from"/$bunfs/root/chunk-fkh93x1w.js";import{M}from"/$bunfs/root/chunk-y7x1gsy0.js";import{nu}from"/$bunfs/root/chunk-5nyank6v.js";import{oa}from"/$bunfs/root/chunk-zmhk2tm0.js";import{Vn}from"/$bunfs/root/chunk-478fqyzs.js";import{isAbsolute as g,sep as a}from"path";function l(e){let n=process.cwd();return n.endsWith(a)?n+e:n+a+e}function qMe(e){return(n)=>e.hostFiles.realPath(nu.workspace(n===""||g(n)?n:l(n)),{native:!0})}function Ru(e){return e===void 0?void 0:{hoverRestOn:M(),realPath:qMe(e)}}import{basename as c,dirname as u,isAbsolute as S,join as p,relative as m,sep as f}from"path";function Gl(e,n){if(!M()||n===void 0)return;if(!e.endsWith(".jsonl"))return;let t=u(e);if(u(t)!==oa())return;let r=c(t),o=c(e,".jsonl");if(e!==p(oa(),r,`${o}.jsonl`))return;let i=Ae.transcript(r,o);return Vn(i)===void 0?{backend:n,key:i}:void 0}function hJn(e,n){if(!M()||n===void 0)return;let t=m(oa(),e);if(t===""||t===".."||t.startsWith(`..${f}`)||S(t))return;let r=t.split(f);if(e!==p(oa(),...r))return;let o=r.at(-1);if(r.length<4||r[2]!=="subagents"||o===void 0||!o.startsWith("agent-")||!o.endsWith(".jsonl"))return;let i=o.slice(6,-6),d=r.slice(3,-1);if(!Gd([r[0],r[1],i])||d.length>0&&!Gd(d))return;let s=Ae.transcript(r[0],r[1],i,d.length>0?d:void 0);return Vn(s)===void 0?{backend:n,key:s}:void 0}function qg(e){if(!M()||e===void 0)return;return{backend:e,transcriptKey:Ae.transcript,isKeySegment:rn,realWorkspacePath:qMe(e)}}function mu(e){return e===void 0?void 0:{source:e,hoverRestOn:M()}}
export{qMe,Ru,Gl,hJn,qg,mu};
