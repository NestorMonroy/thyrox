// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{l}from"/$bunfs/root/chunk-xzmtst7a.js";import{Yt}from"/$bunfs/root/chunk-qezj5211.js";import{Ae}from"/$bunfs/root/chunk-y87vtd8k.js";import{O}from"/$bunfs/root/chunk-x7f60hk6.js";import{S,n}from"/$bunfs/root/chunk-y5pwxex8.js";import{Se}from"/$bunfs/root/chunk-fvzv4ke0.js";import{Rm,AG}from"/$bunfs/root/chunk-wdt4vs8t.js";import{Rt}from"/$bunfs/root/chunk-9206rsny.js";import{join as u}from"path";function Nst(){return u(Se(),"daemon.status.json")}function Fst(){return Ae.state("daemon-status")}async function IFn(e,r){let o={supervisorPid:process.pid,supervisorProcStart:AG(),writtenAt:Date.now(),workers:e};if(O()&&r!==void 0){try{let t=await r.write(Fst(),S(o,null,2),{mode:438&~process.umask()});if(!t.ok)n(`writeDaemonStatus: ${t.error.code}`)}catch(t){n(`writeDaemonStatus: ${l(t)}`)}return}try{await Yt().atomicWrite(Nst(),S(o,null,2))}catch{}}async function xFn(e){if(O()&&e!==void 0){try{let r=await e.delete(Fst());if(!r.ok)n(`removeDaemonStatus: ${r.error.code}`)}catch(r){n(`removeDaemonStatus: ${l(r)}`)}return}try{await Yt().delete(Nst())}catch{}}async function LFn(e){let r;if(O()&&e!==void 0){let a;try{a=await e.readText([Fst()])}catch{return null}if(!a.ok)return null;let s=a.value.items[0];if(!s.found)return null;r=s.value}else try{r=await Yt().read(Nst())}catch{return null}let o=Rt(r,!1);if(!o||typeof o!=="object")return null;let t=o;if(typeof t.supervisorPid!=="number"||typeof t.workers!=="object"||t.workers===null)return null;try{process.kill(t.supervisorPid,0)}catch{return null}let i=typeof t.supervisorProcStart==="string"?t.supervisorProcStart:void 0;if(!await Rm(t.supervisorPid,i))return null;return o}
export{Nst,Fst,IFn,xFn,LFn};
