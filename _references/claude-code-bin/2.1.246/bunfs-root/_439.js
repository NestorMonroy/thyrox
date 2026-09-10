// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Xcd as i,bdd as f}from"/$bunfs/root/_815.js";import{Nud as e,hvd as o,zvd as c}from"/$bunfs/root/_831.js";import{xxd as l}from"/$bunfs/root/_837.js";import{lstat as s,readlink as u,realpath as d}from"fs/promises";import{dirname as w,join as p,resolve as y,sep as n}from"path";async function T(r){if(i()==="windows")return!0;try{return await a(r,await s(r))}catch(t){return o(t)}}async function a(r,t){if(!t.isSymbolicLink())return!1;let m=await u(r);return y(w(r),m).includes(g)}async function S(r){let t=await d(r);return t.endsWith(".js")||t.includes("node_modules")}async function I(r){if(i()==="windows")return!0;try{let t=await s(r);if(!t.isSymbolicLink())return!1;return await a(r,t)||await S(r)}catch(t){if(e(t)!==void 0)return!1;throw t}}var g;var b=l(()=>{c();f();g=n+p("claude","versions")+n});
export{T as IZ,S as JZ,I as KZ,b as LZ};
