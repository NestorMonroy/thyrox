// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Ao}from"/$bunfs/root/chunk-t8q7n4ta.js";import{_t,In,Qn}from"/$bunfs/root/chunk-btbsn9s4.js";import{M6}from"/$bunfs/root/chunk-nfkb1gwg.js";import{zY,xHe,n6}from"/$bunfs/root/chunk-2c46kq0f.js";import{yat}from"/$bunfs/root/chunk-5d70en58.js";import{e}from"/$bunfs/root/chunk-zhg3ync1.js";import{USe,KVe,BSe}from"/$bunfs/root/chunk-27758xpf.js";var s=import.meta.require("/$bunfs/root/chunk-2602nhhr.js").ExtraUsageDialog;async function zbe(u,n){let t=M6(u);if(s&&KVe())return e(s,{onDone:t});let o=await BSe({openInBrowser:!0},n.credentials);if(o.type==="message")return t(o.value),null;if(o.type==="confirm-admin-request"){if(_t())return t(USe),null;return e(yat,{extraUsage:o.extraUsage,wouldTakeAnswer:()=>!0,onDone:t})}let i=Qn();if(i==="team"||i==="enterprise")return t(o.opened?`Opened ${o.url} in your browser to manage usage credits for your organization.`:`Visit ${o.url} to manage usage credits for your organization.`),null;if(!o.opened)return t(`Visit ${o.url} to manage usage credits.`),null;let r=In(),m=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},l=Ao();return e(n6,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(a,d,c)=>{let g=await zY(n,a,{setAppState:c,previousAccount:m,previousGatewayAuth:l});t(...xHe(n,a,g))}})}
export{zbe};
