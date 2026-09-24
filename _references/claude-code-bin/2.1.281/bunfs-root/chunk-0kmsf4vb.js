// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{l}from"/$bunfs/root/chunk-2bj5eqbj.js";import{F}from"/$bunfs/root/chunk-7yckkh1m.js";import{S,t}from"/$bunfs/root/chunk-wfscmafr.js";import{we}from"/$bunfs/root/chunk-8bp13hnn.js";import{nn}from"/$bunfs/root/chunk-a22am1vw.js";import{Re}from"/$bunfs/root/chunk-99avamm5.js";import{Zy,V8}from"/$bunfs/root/chunk-ftmzfxxh.js";import{ft}from"/$bunfs/root/chunk-v5zz2h09.js";import{join as u}from"path";function DFt(){return u(we(),"daemon.status.json")}function LFt(){return Re.state("daemon-status")}async function h1r(o,r){let s={supervisorPid:process.pid,supervisorProcStart:V8(),writtenAt:Date.now(),workers:o};if(F()&&r!==void 0)try{let e=await r.write(LFt(),S(s,null,2),{mode:438&~process.umask()});if(!e.ok)t(`writeDaemonStatus: ${e.error.code}`);return e.ok}catch(e){return t(`writeDaemonStatus: ${l(e)}`),!1}try{return await nn().atomicWrite(DFt(),S(s,null,2)),!0}catch(e){return t(`writeDaemonStatus: ${l(e)}`),!1}}async function y1r(o){if(F()&&o!==void 0){try{let r=await o.delete(LFt());if(!r.ok)t(`removeDaemonStatus: ${r.error.code}`)}catch(r){t(`removeDaemonStatus: ${l(r)}`)}return}try{await nn().delete(DFt())}catch{}}async function _1r(o){let r;if(F()&&o!==void 0){let n;try{n=await o.readText([LFt()])}catch{return null}if(!n.ok)return null;let i=n.value.items[0];if(!i.found)return null;r=i.value}else try{r=await nn().read(DFt())}catch{return null}let s=ft(r,!1);if(!s||typeof s!=="object")return null;let e=s;if(typeof e.supervisorPid!=="number"||typeof e.workers!=="object"||e.workers===null)return null;try{process.kill(e.supervisorPid,0)}catch{return null}let a=typeof e.supervisorProcStart==="string"?e.supervisorProcStart:void 0;if(!await Zy(e.supervisorPid,a))return null;return s}function b1r(o){return[]}
export{DFt,LFt,h1r,y1r,_1r,b1r};
