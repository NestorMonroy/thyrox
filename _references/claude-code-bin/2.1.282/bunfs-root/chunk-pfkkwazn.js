// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{nn}from"/$bunfs/root/chunk-bjy6zt8z.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{Rt}from"/$bunfs/root/chunk-xt60grfb.js";import{De}from"/$bunfs/root/chunk-txvgrx83.js";import{ay,hm}from"/$bunfs/root/chunk-wbbthbh9.js";import{Xt}from"/$bunfs/root/chunk-79j763ea.js";function oer({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function ser(t){let e=nn(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await ay(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function L_e(t){let e;try{e=hm()?.accountUuid}catch{e=void 0}return oer({storedAccountUuid:e,hostAccountUuid:await ser(t)})}function Lne(){return r()===void 0}function r(){if(Rt()||De()!=="firstParty")return"egress";return Xt("allow_remote_sessions")?void 0:"policy_org"}
export{oer,ser,L_e,Lne};
