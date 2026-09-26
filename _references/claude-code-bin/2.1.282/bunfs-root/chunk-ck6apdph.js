// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{l}from"/$bunfs/root/chunk-dw9y6h6j.js";import{N}from"/$bunfs/root/chunk-hm6k4hcw.js";import{S,t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{ve}from"/$bunfs/root/chunk-37swe2q7.js";import{rn}from"/$bunfs/root/chunk-x80cfbm0.js";import{Re}from"/$bunfs/root/chunk-z3ns4mz4.js";import{p_,N9}from"/$bunfs/root/chunk-7rt268hn.js";import{dt}from"/$bunfs/root/chunk-sentf9c1.js";import{join as u}from"path";function S1t(){return u(ve(),"daemon.status.json")}function w1t(){return Re.state("daemon-status")}async function zGr(o,r){let s={supervisorPid:process.pid,supervisorProcStart:N9(),writtenAt:Date.now(),workers:o};if(N()&&r!==void 0)try{let e=await r.write(w1t(),S(s,null,2),{mode:438&~process.umask()});if(!e.ok)t(`writeDaemonStatus: ${e.error.code}`);return e.ok}catch(e){return t(`writeDaemonStatus: ${l(e)}`),!1}try{return await rn().atomicWrite(S1t(),S(s,null,2)),!0}catch(e){return t(`writeDaemonStatus: ${l(e)}`),!1}}async function GGr(o){if(N()&&o!==void 0){try{let r=await o.delete(w1t());if(!r.ok)t(`removeDaemonStatus: ${r.error.code}`)}catch(r){t(`removeDaemonStatus: ${l(r)}`)}return}try{await rn().delete(S1t())}catch{}}async function VGr(o){let r;if(N()&&o!==void 0){let n;try{n=await o.readText([w1t()])}catch{return null}if(!n.ok)return null;let i=n.value.items[0];if(!i.found)return null;r=i.value}else try{r=await rn().read(S1t())}catch{return null}let s=dt(r,!1);if(!s||typeof s!=="object")return null;let e=s;if(typeof e.supervisorPid!=="number"||typeof e.workers!=="object"||e.workers===null)return null;try{process.kill(e.supervisorPid,0)}catch{return null}let a=typeof e.supervisorProcStart==="string"?e.supervisorProcStart:void 0;if(!await p_(e.supervisorPid,a))return null;return s}function qGr(o){return[]}
export{S1t,w1t,zGr,GGr,VGr,qGr};
