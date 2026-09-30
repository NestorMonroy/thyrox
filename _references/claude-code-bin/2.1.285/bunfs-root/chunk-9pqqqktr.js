// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Jt}from"/$bunfs/root/chunk-b1a55n2g.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{bg,hm}from"/$bunfs/root/chunk-f74xvn8g.js";function mdr({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function gdr(t){let e=Jt(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await bg(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function Uwe(t){let e;try{e=hm()?.accountUuid}catch{e=void 0}return mdr({storedAccountUuid:e,hostAccountUuid:await gdr(t)})}
export{mdr,gdr,Uwe};
