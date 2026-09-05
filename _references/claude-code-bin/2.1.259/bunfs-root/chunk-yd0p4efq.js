// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Vn}from"/$bunfs/root/chunk-x1rrg5j2.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{vt}from"/$bunfs/root/chunk-6rkpsn9e.js";import{cE,By}from"/$bunfs/root/chunk-x722nt0q.js";import{Me}from"/$bunfs/root/chunk-xfn8hpdj.js";import{Ft}from"/$bunfs/root/chunk-1qpkzqbm.js";function Zln({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function ecn(t){let e=Vn(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await cE(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function zte(t){let e;try{e=By()?.accountUuid}catch{e=void 0}return Zln({storedAccountUuid:e,hostAccountUuid:await ecn(t)})}function tX(){return r()===void 0}function r(){if(vt()||Me()!=="firstParty")return"egress";return Ft("allow_remote_sessions")?void 0:"policy_org"}
export{Zln,ecn,zte,tX};
