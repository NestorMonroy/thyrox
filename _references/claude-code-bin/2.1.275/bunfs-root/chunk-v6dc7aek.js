// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{zo}from"/$bunfs/root/chunk-4qqe0nh4.js";import{Et,xn,cr}from"/$bunfs/root/chunk-xbd48fav.js";import{L7}from"/$bunfs/root/chunk-az8htac2.js";import{Dne,uze,pJ}from"/$bunfs/root/chunk-tcr45npq.js";import{tTt}from"/$bunfs/root/chunk-v1r6yrzs.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";import{_0e,wot,b0e}from"/$bunfs/root/chunk-d331wkpk.js";var s=import.meta.require("/$bunfs/root/chunk-npyzxfd3.js").ExtraUsageDialog;async function RPe(u,n){let t=L7(u);if(s&&wot())return e(s,{onDone:t});let o=await b0e({openInBrowser:!0},n.credentials);if(o.type==="message")return t(o.value),null;if(o.type==="confirm-admin-request"){if(Et())return t(_0e),null;return e(tTt,{extraUsage:o.extraUsage,wouldTakeAnswer:()=>!0,onDone:t})}let i=cr();if(i==="team"||i==="enterprise")return t(o.opened?`Opened ${o.url} in your browser to manage usage credits for your organization.`:`Visit ${o.url} to manage usage credits for your organization.`),null;if(!o.opened)return t(`Visit ${o.url} to manage usage credits.`),null;let r=xn(),l=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},g=zo();return e(pJ,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(a,d,m)=>{let c=await Dne(n,a,{setAppState:m,previousAccount:l,previousGatewayAuth:g});t(...uze(n,a,c))}})}
export{RPe};
