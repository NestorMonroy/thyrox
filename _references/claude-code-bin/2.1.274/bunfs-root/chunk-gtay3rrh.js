// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{mn}from"/$bunfs/root/chunk-4cmy5sqz.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import{kt}from"/$bunfs/root/chunk-b565vq97.js";import{nv,fm}from"/$bunfs/root/chunk-27bj2wbx.js";import{He}from"/$bunfs/root/chunk-zsdbd62x.js";import{Yt}from"/$bunfs/root/chunk-vh7s70pn.js";function bOn({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function SOn(t){let e=mn(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await nv(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function Qce(t){let e;try{e=fm()?.accountUuid}catch{e=void 0}return bOn({storedAccountUuid:e,hostAccountUuid:await SOn(t)})}function _J(){return r()===void 0}function r(){if(kt()||He()!=="firstParty")return"egress";return Yt("allow_remote_sessions")?void 0:"policy_org"}
export{bOn,SOn,Qce,_J};
