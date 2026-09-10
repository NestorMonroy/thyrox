// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{UUb as s,VUb as B}from"/$bunfs/root/_604.js";import{eBc as y,iBc as g,pBc as j}from"/$bunfs/root/_694.js";import{aYc as S,gYc as x}from"/$bunfs/root/_747.js";import{G0c as f,O0c as b}from"/$bunfs/root/_753.js";import{jhd as n,mgd as u,ohd as h,ugd as D}from"/$bunfs/root/_820.js";import{Uhd as d,nid as P}from"/$bunfs/root/_824.js";import{nud as a,pud as k}from"/$bunfs/root/_829.js";import{Mud as m,zvd as v}from"/$bunfs/root/_831.js";B();k();b();h();P();v();j();x();D();import{join as F}from"path";function c(){return F(d(),"daemon.status.json")}function l(){return f.state("daemon-status")}async function T(e,r){let o={supervisorPid:process.pid,supervisorProcStart:g(),writtenAt:Date.now(),workers:e};if(a()&&r!==void 0){try{let t=await r.write(l(),u(o,null,2),{mode:438&~process.umask()});if(!t.ok)n(`writeDaemonStatus: ${t.error.code}`)}catch(t){n(`writeDaemonStatus: ${m(t)}`)}return}try{await s().atomicWrite(c(),u(o,null,2))}catch{}}async function q(e){if(a()&&e!==void 0){try{let r=await e.delete(l());if(!r.ok)n(`removeDaemonStatus: ${r.error.code}`)}catch(r){n(`removeDaemonStatus: ${m(r)}`)}return}try{await s().delete(c())}catch{}}async function z(e){let r;if(a()&&e!==void 0){let i;try{i=await e.readText([l()])}catch{return null}if(!i.ok)return null;let p=i.value.items[0];if(!p.found)return null;r=p.value}else try{r=await s().read(c())}catch{return null}let o=S(r,!1);if(!o||typeof o!=="object")return null;let t=o;if(typeof t.supervisorPid!=="number"||typeof t.workers!=="object"||t.workers===null)return null;try{process.kill(t.supervisorPid,0)}catch{return null}let w=typeof t.supervisorProcStart==="string"?t.supervisorProcStart:void 0;if(!await y(t.supervisorPid,w))return null;return o}
export{c as Yg,l as Zg,T as _g,q as $g,z as ah};
