// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{l}from"/$bunfs/root/chunk-vfrpernt.js";import{Xt}from"/$bunfs/root/chunk-y4ms75k8.js";import{ke}from"/$bunfs/root/chunk-4te7e7q8.js";import{N}from"/$bunfs/root/chunk-m3k3498d.js";import{S,t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{Se}from"/$bunfs/root/chunk-qsnhycbm.js";import{Ym,DW}from"/$bunfs/root/chunk-fbrtdkc9.js";import{Rt}from"/$bunfs/root/chunk-7pzst5bj.js";import{join as u}from"path";function flt(){return u(Se(),"daemon.status.json")}function mlt(){return ke.state("daemon-status")}async function m2n(o,e){let n={supervisorPid:process.pid,supervisorProcStart:DW(),writtenAt:Date.now(),workers:o};if(N()&&e!==void 0){try{let r=await e.write(mlt(),S(n,null,2),{mode:438&~process.umask()});if(!r.ok)t(`writeDaemonStatus: ${r.error.code}`)}catch(r){t(`writeDaemonStatus: ${l(r)}`)}return}try{await Xt().atomicWrite(flt(),S(n,null,2))}catch{}}async function g2n(o){if(N()&&o!==void 0){try{let e=await o.delete(mlt());if(!e.ok)t(`removeDaemonStatus: ${e.error.code}`)}catch(e){t(`removeDaemonStatus: ${l(e)}`)}return}try{await Xt().delete(flt())}catch{}}async function h2n(o){let e;if(N()&&o!==void 0){let a;try{a=await o.readText([mlt()])}catch{return null}if(!a.ok)return null;let s=a.value.items[0];if(!s.found)return null;e=s.value}else try{e=await Xt().read(flt())}catch{return null}let n=Rt(e,!1);if(!n||typeof n!=="object")return null;let r=n;if(typeof r.supervisorPid!=="number"||typeof r.workers!=="object"||r.workers===null)return null;try{process.kill(r.supervisorPid,0)}catch{return null}let i=typeof r.supervisorProcStart==="string"?r.supervisorProcStart:void 0;if(!await Ym(r.supervisorPid,i))return null;return n}
export{flt,mlt,m2n,g2n,h2n};
