// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{l}from"/$bunfs/root/chunk-3btyksgt.js";import{en}from"/$bunfs/root/chunk-hf9yhhhe.js";import{Re}from"/$bunfs/root/chunk-z0202m3z.js";import{F}from"/$bunfs/root/chunk-p7hrkaq4.js";import{w,t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{we}from"/$bunfs/root/chunk-53a5hn9r.js";import{xh,j4}from"/$bunfs/root/chunk-j7xqd34f.js";import{bt}from"/$bunfs/root/chunk-deawgr1z.js";import{join as u}from"path";function vkt(){return u(we(),"daemon.status.json")}function Ekt(){return Re.state("daemon-status")}async function fdr(o,e){let n={supervisorPid:process.pid,supervisorProcStart:j4(),writtenAt:Date.now(),workers:o};if(F()&&e!==void 0){try{let r=await e.write(Ekt(),w(n,null,2),{mode:438&~process.umask()});if(!r.ok)t(`writeDaemonStatus: ${r.error.code}`)}catch(r){t(`writeDaemonStatus: ${l(r)}`)}return}try{await en().atomicWrite(vkt(),w(n,null,2))}catch{}}async function mdr(o){if(F()&&o!==void 0){try{let e=await o.delete(Ekt());if(!e.ok)t(`removeDaemonStatus: ${e.error.code}`)}catch(e){t(`removeDaemonStatus: ${l(e)}`)}return}try{await en().delete(vkt())}catch{}}async function gdr(o){let e;if(F()&&o!==void 0){let a;try{a=await o.readText([Ekt()])}catch{return null}if(!a.ok)return null;let s=a.value.items[0];if(!s.found)return null;e=s.value}else try{e=await en().read(vkt())}catch{return null}let n=bt(e,!1);if(!n||typeof n!=="object")return null;let r=n;if(typeof r.supervisorPid!=="number"||typeof r.workers!=="object"||r.workers===null)return null;try{process.kill(r.supervisorPid,0)}catch{return null}let i=typeof r.supervisorProcStart==="string"?r.supervisorProcStart:void 0;if(!await xh(r.supervisorPid,i))return null;return n}
export{vkt,Ekt,fdr,mdr,gdr};
