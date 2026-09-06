// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Kn}from"/$bunfs/root/chunk-k6vqz9fa.js";import{a}from"/$bunfs/root/chunk-bxegdt3f.js";import{bt}from"/$bunfs/root/chunk-r1xh498w.js";import{Nw,ph}from"/$bunfs/root/chunk-32f2qmtc.js";import{Le}from"/$bunfs/root/chunk-1wrntbps.js";import{Mt}from"/$bunfs/root/chunk-bfe59bf9.js";function Nan({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function Fan(t){let e=Kn(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await Nw(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function lte(t){let e;try{e=ph()?.accountUuid}catch{e=void 0}return Nan({storedAccountUuid:e,hostAccountUuid:await Fan(t)})}function xY(){return r()===void 0}function r(){if(bt()||Le()!=="firstParty")return"egress";return Mt("allow_remote_sessions")?void 0:"policy_org"}
export{Nan,Fan,lte,xY};
