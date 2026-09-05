// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{ns}from"/$bunfs/root/chunk-annedm50.js";import{yt,kn,Qn}from"/$bunfs/root/chunk-hyqdn9c0.js";import{h9}from"/$bunfs/root/chunk-4hp4250a.js";import{C6,TIe,F4}from"/$bunfs/root/chunk-css07v8t.js";import{Bot}from"/$bunfs/root/chunk-18keyzh7.js";import{e}from"/$bunfs/root/chunk-gbn257vp.js";import{ebe,RWe,tbe}from"/$bunfs/root/chunk-71zq5n19.js";var s=import.meta.require("/$bunfs/root/chunk-pvzdnhjb.js").ExtraUsageDialog;async function n_e(u,n){let t=h9(u);if(s&&RWe())return e(s,{onDone:t});let o=await tbe({openInBrowser:!0},n.credentials);if(o.type==="message")return t(o.value),null;if(o.type==="confirm-admin-request"){if(yt())return t(ebe),null;return e(Bot,{extraUsage:o.extraUsage,wouldTakeAnswer:()=>!0,onDone:t})}let i=Qn();if(i==="team"||i==="enterprise")return t(o.opened?`Opened ${o.url} in your browser to manage usage credits for your organization.`:`Visit ${o.url} to manage usage credits for your organization.`),null;if(!o.opened)return t(`Visit ${o.url} to manage usage credits.`),null;let r=kn(),m=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},l=ns();return e(F4,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(a,d,c)=>{let g=await C6(n,a,{setAppState:c,previousAccount:m,previousGatewayAuth:l});t(...TIe(n,a,g))}})}
export{n_e};
