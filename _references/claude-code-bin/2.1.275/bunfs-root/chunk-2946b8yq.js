// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{dn}from"/$bunfs/root/chunk-q7rz8cer.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{Ct}from"/$bunfs/root/chunk-gh1pqen9.js";import{hS,km}from"/$bunfs/root/chunk-xbd48fav.js";import{He}from"/$bunfs/root/chunk-ffayvr1z.js";import{Vt}from"/$bunfs/root/chunk-96tx2e97.js";function VNn({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function KNn(t){let e=dn(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await hS(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function ode(t){let e;try{e=km()?.accountUuid}catch{e=void 0}return VNn({storedAccountUuid:e,hostAccountUuid:await KNn(t)})}function t7(){return r()===void 0}function r(){if(Ct()||He()!=="firstParty")return"egress";return Vt("allow_remote_sessions")?void 0:"policy_org"}
export{VNn,KNn,ode,t7};
