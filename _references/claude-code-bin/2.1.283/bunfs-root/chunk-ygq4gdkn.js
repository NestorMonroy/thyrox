// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{en}from"/$bunfs/root/chunk-s1pmhfks.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{Mg,Om}from"/$bunfs/root/chunk-t6pwageh.js";function aar({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function lar(t){let e=en(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await Mg(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function NSe(t){let e;try{e=Om()?.accountUuid}catch{e=void 0}return aar({storedAccountUuid:e,hostAccountUuid:await lar(t)})}
export{aar,lar,NSe};
