// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{l}from"/$bunfs/root/chunk-xtc2dmbe.js";import{Xt}from"/$bunfs/root/chunk-t5j5p2ne.js";import{Ae}from"/$bunfs/root/chunk-fkh93x1w.js";import{M}from"/$bunfs/root/chunk-y7x1gsy0.js";import{b,t}from"/$bunfs/root/chunk-5nyank6v.js";import{Se}from"/$bunfs/root/chunk-0sa7g6pk.js";import{Wm,DG}from"/$bunfs/root/chunk-7npsafxm.js";import{Dt}from"/$bunfs/root/chunk-gvnmfkwa.js";import{join as u}from"path";function $ot(){return u(Se(),"daemon.status.json")}function Mot(){return Ae.state("daemon-status")}async function uNn(o,e){let n={supervisorPid:process.pid,supervisorProcStart:DG(),writtenAt:Date.now(),workers:o};if(M()&&e!==void 0){try{let r=await e.write(Mot(),b(n,null,2),{mode:438&~process.umask()});if(!r.ok)t(`writeDaemonStatus: ${r.error.code}`)}catch(r){t(`writeDaemonStatus: ${l(r)}`)}return}try{await Xt().atomicWrite($ot(),b(n,null,2))}catch{}}async function dNn(o){if(M()&&o!==void 0){try{let e=await o.delete(Mot());if(!e.ok)t(`removeDaemonStatus: ${e.error.code}`)}catch(e){t(`removeDaemonStatus: ${l(e)}`)}return}try{await Xt().delete($ot())}catch{}}async function fNn(o){let e;if(M()&&o!==void 0){let a;try{a=await o.readText([Mot()])}catch{return null}if(!a.ok)return null;let s=a.value.items[0];if(!s.found)return null;e=s.value}else try{e=await Xt().read($ot())}catch{return null}let n=Dt(e,!1);if(!n||typeof n!=="object")return null;let r=n;if(typeof r.supervisorPid!=="number"||typeof r.workers!=="object"||r.workers===null)return null;try{process.kill(r.supervisorPid,0)}catch{return null}let i=typeof r.supervisorProcStart==="string"?r.supervisorProcStart:void 0;if(!await Wm(r.supervisorPid,i))return null;return n}
export{$ot,Mot,uNn,dNn,fNn};
