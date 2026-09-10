// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{l}from"/$bunfs/root/chunk-058caznt.js";import{Kt}from"/$bunfs/root/chunk-h96shwz8.js";import{ve}from"/$bunfs/root/chunk-ptdm1fhw.js";import{M}from"/$bunfs/root/chunk-56nvyfje.js";import{b,t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{be}from"/$bunfs/root/chunk-kn2qhfka.js";import{zm,eW}from"/$bunfs/root/chunk-3r19kwqx.js";import{Dt}from"/$bunfs/root/chunk-enjww0fp.js";import{join as u}from"path";function ust(){return u(be(),"daemon.status.json")}function dst(){return ve.state("daemon-status")}async function u1n(o,e){let n={supervisorPid:process.pid,supervisorProcStart:eW(),writtenAt:Date.now(),workers:o};if(M()&&e!==void 0){try{let r=await e.write(dst(),b(n,null,2),{mode:438&~process.umask()});if(!r.ok)t(`writeDaemonStatus: ${r.error.code}`)}catch(r){t(`writeDaemonStatus: ${l(r)}`)}return}try{await Kt().atomicWrite(ust(),b(n,null,2))}catch{}}async function d1n(o){if(M()&&o!==void 0){try{let e=await o.delete(dst());if(!e.ok)t(`removeDaemonStatus: ${e.error.code}`)}catch(e){t(`removeDaemonStatus: ${l(e)}`)}return}try{await Kt().delete(ust())}catch{}}async function f1n(o){let e;if(M()&&o!==void 0){let a;try{a=await o.readText([dst()])}catch{return null}if(!a.ok)return null;let s=a.value.items[0];if(!s.found)return null;e=s.value}else try{e=await Kt().read(ust())}catch{return null}let n=Dt(e,!1);if(!n||typeof n!=="object")return null;let r=n;if(typeof r.supervisorPid!=="number"||typeof r.workers!=="object"||r.workers===null)return null;try{process.kill(r.supervisorPid,0)}catch{return null}let i=typeof r.supervisorProcStart==="string"?r.supervisorProcStart:void 0;if(!await zm(r.supervisorPid,i))return null;return n}
export{ust,dst,u1n,d1n,f1n};
