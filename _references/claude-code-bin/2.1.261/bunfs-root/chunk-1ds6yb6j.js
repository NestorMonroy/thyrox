// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Kn}from"/$bunfs/root/chunk-annedm50.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{bt}from"/$bunfs/root/chunk-e1njvp95.js";import{Nw,ph}from"/$bunfs/root/chunk-hyqdn9c0.js";import{Le}from"/$bunfs/root/chunk-hs05644q.js";import{Mt}from"/$bunfs/root/chunk-k6jfq7mw.js";function Oan({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function Nan(t){let e=Kn(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await Nw(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function ite(t){let e;try{e=ph()?.accountUuid}catch{e=void 0}return Oan({storedAccountUuid:e,hostAccountUuid:await Nan(t)})}function CY(){return r()===void 0}function r(){if(bt()||Le()!=="firstParty")return"egress";return Mt("allow_remote_sessions")?void 0:"policy_org"}
export{Oan,Nan,ite,CY};
