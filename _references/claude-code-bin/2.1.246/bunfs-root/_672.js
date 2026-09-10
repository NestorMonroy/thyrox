// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as s}from"/$bunfs/root/_837.js";import{readFileSync as a,lstatSync as l}from"fs";import{lstat as c,readFile as o}from"fs/promises";async function y(t,n){try{let e=await c(t);if(!e.isFile()||e.size>n)return null;return await o(t,"utf8")}catch{return null}}function f(t,n){try{let e=l(t);if(!e.isFile()||e.size>n)return null;return a(t,"utf8")}catch{return null}}async function F(t,n,e,r){let i=await t.stat(n);if(!i.isFile()||i.size>e)return r?.(i),null;return await t.readFile(n,{encoding:"utf8"})}function S(t,n,e){let r=t.statSync(n);if(!r.isFile()||r.size>e)return null;return t.readFileSync(n,{encoding:"utf8"})}var u=()=>{};
export{y as Jwc,f as Kwc,F as Lwc,S as Mwc,u as Nwc};
