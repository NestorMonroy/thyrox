// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Lqc as A,Opc as d,ehc as s,epc as a,lhc as m}from"/$bunfs/root/_668.js";import{XBc as i,kCc as l}from"/$bunfs/root/_695.js";import{Tbd as p}from"/$bunfs/root/_811.js";import{ncd as c}from"/$bunfs/root/_812.js";import{Aed as f,wed as o}from"/$bunfs/root/_816.js";import{Cid as u,Eid as g}from"/$bunfs/root/_826.js";import{xxd as n}from"/$bunfs/root/_837.js";function O(){return!o()&&i()==="firstParty"&&s("allow_remote_sessions")}var v=n(()=>{l();m();f()});function C({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function y(t){let e=u(c.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let r=await a(t);return r==="env"||r==="fd"?e:void 0}catch{return}}async function E(t){let e;try{e=d()?.accountUuid}catch{e=void 0}return C({storedAccountUuid:e,hostAccountUuid:await y(t)})}var D=n(()=>{A();p();g()});
export{O as xY,v as yY,C as zY,y as AY,E as BY,D as CY};
