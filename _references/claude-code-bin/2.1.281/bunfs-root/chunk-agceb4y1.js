// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{rn}from"/$bunfs/root/chunk-kp7gknaw.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";import{xt}from"/$bunfs/root/chunk-0n80jtth.js";import{He}from"/$bunfs/root/chunk-6r1h1xyw.js";import{Uh,dm}from"/$bunfs/root/chunk-5khn4tvf.js";import{Xt}from"/$bunfs/root/chunk-649gsb4b.js";function nJn({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function rJn(t){let e=rn(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await Uh(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function Eye(t){let e;try{e=dm()?.accountUuid}catch{e=void 0}return nJn({storedAccountUuid:e,hostAccountUuid:await rJn(t)})}function jte(){return r()===void 0}function r(){if(xt()||He()!=="firstParty")return"egress";return Xt("allow_remote_sessions")?void 0:"policy_org"}
export{nJn,rJn,Eye,jte};
