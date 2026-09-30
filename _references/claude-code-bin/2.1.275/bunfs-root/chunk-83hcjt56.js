// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{l}from"/$bunfs/root/chunk-d5d0zdsy.js";import{F}from"/$bunfs/root/chunk-h401nbms.js";import{S,t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{ve}from"/$bunfs/root/chunk-6ghkw3jc.js";import{Zt}from"/$bunfs/root/chunk-qwxqekf7.js";import{Re}from"/$bunfs/root/chunk-vtbas3eg.js";import{jh,j3}from"/$bunfs/root/chunk-01m22vhx.js";import{wt}from"/$bunfs/root/chunk-kstt0hst.js";import{join as u}from"path";function iCt(){return u(ve(),"daemon.status.json")}function aCt(){return Re.state("daemon-status")}async function Uhr(o,e){let n={supervisorPid:process.pid,supervisorProcStart:j3(),writtenAt:Date.now(),workers:o};if(F()&&e!==void 0){try{let r=await e.write(aCt(),S(n,null,2),{mode:438&~process.umask()});if(!r.ok)t(`writeDaemonStatus: ${r.error.code}`)}catch(r){t(`writeDaemonStatus: ${l(r)}`)}return}try{await Zt().atomicWrite(iCt(),S(n,null,2))}catch{}}async function Bhr(o){if(F()&&o!==void 0){try{let e=await o.delete(aCt());if(!e.ok)t(`removeDaemonStatus: ${e.error.code}`)}catch(e){t(`removeDaemonStatus: ${l(e)}`)}return}try{await Zt().delete(iCt())}catch{}}async function jhr(o){let e;if(F()&&o!==void 0){let a;try{a=await o.readText([aCt()])}catch{return null}if(!a.ok)return null;let s=a.value.items[0];if(!s.found)return null;e=s.value}else try{e=await Zt().read(iCt())}catch{return null}let n=wt(e,!1);if(!n||typeof n!=="object")return null;let r=n;if(typeof r.supervisorPid!=="number"||typeof r.workers!=="object"||r.workers===null)return null;try{process.kill(r.supervisorPid,0)}catch{return null}let i=typeof r.supervisorProcStart==="string"?r.supervisorProcStart:void 0;if(!await jh(r.supervisorPid,i))return null;return n}
export{iCt,aCt,Uhr,Bhr,jhr};
