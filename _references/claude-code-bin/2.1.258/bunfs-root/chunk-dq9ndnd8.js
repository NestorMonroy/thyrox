// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{qn}from"/$bunfs/root/chunk-b1z7jvb2.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{kt}from"/$bunfs/root/chunk-hfch6q45.js";import{Xw,Py}from"/$bunfs/root/chunk-8qt7d28b.js";import{Me}from"/$bunfs/root/chunk-cnazfz7b.js";import{Nt}from"/$bunfs/root/chunk-5t2y5d74.js";function isn({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function ssn(t){let e=qn(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await Xw(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function Qee(t){let e;try{e=Py()?.accountUuid}catch{e=void 0}return isn({storedAccountUuid:e,hostAccountUuid:await ssn(t)})}function hY(){return r()===void 0}function r(){if(kt()||Me()!=="firstParty")return"egress";return Nt("allow_remote_sessions")?void 0:"policy_org"}
export{isn,ssn,Qee,hY};
