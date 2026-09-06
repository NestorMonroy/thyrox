// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{V}from"/$bunfs/root/chunk-mh9y4c2z.js";import{Ksr}from"/$bunfs/root/chunk-0kgwcnth.js";import{L}from"/$bunfs/root/chunk-vmja0gjy.js";import{readlinkSync as e}from"fs";import{hostname as u}from"os";class o{pidSpace=null;pidDomain=void 0;uidsCollapse=null}var Fse=new o;function vZe(){if(Fse.pidSpace===null){let n="";try{n=e("/proc/self/ns/pid")}catch{n=""}Fse.pidSpace=`${u()}${n===""?"":"#"+n}`}return Fse.pidSpace}function uK(){return Fse.pidDomain??=(async()=>Ksr(L()))().catch((n)=>{throw Fse.pidDomain=void 0,n}),Fse.pidDomain}import{timingSafeEqual as a}from"crypto";import{readFile as f}from"fs/promises";async function STe(n){try{let t=V(await f(n,"utf8"));if(t===null||typeof t!=="object")return;let i={};if("rvAuth"in t&&typeof t.rvAuth==="string")i.rvAuth=t.rvAuth;if("ptyAuth"in t&&typeof t.ptyAuth==="string")i.ptyAuth=t.ptyAuth;if("claimAuth"in t&&typeof t.claimAuth==="string")i.claimAuth=t.claimAuth;return i}catch{return}}function DT(n,t){if(typeof n!=="string"||!t||n.length===0)return!1;let i=Buffer.from(n),r=Buffer.from(t);if(i.length!==r.length)return!1;return a(i,r)}
export{Fse,vZe,uK,STe,DT};
