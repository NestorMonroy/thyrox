// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Kn}from"/$bunfs/root/chunk-t8q7n4ta.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{St}from"/$bunfs/root/chunk-jvycdhmw.js";import{gE,Dh}from"/$bunfs/root/chunk-btbsn9s4.js";import{Ie}from"/$bunfs/root/chunk-5jacf3nm.js";import{$t}from"/$bunfs/root/chunk-7c2v1bj6.js";function Aun({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function Tun(t){let e=Kn(a.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await gE(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function yne(t){let e;try{e=Dh()?.accountUuid}catch{e=void 0}return Aun({storedAccountUuid:e,hostAccountUuid:await Tun(t)})}function NX(){return r()===void 0}function r(){if(St()||Ie()!=="firstParty")return"egress";return $t("allow_remote_sessions")?void 0:"policy_org"}
export{Aun,Tun,yne,NX};
