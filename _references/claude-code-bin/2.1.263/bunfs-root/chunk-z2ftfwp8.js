// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{ns}from"/$bunfs/root/chunk-k6vqz9fa.js";import{yt,kn,Qn}from"/$bunfs/root/chunk-32f2qmtc.js";import{_9}from"/$bunfs/root/chunk-2c0zm87n.js";import{x6,TIe,U4}from"/$bunfs/root/chunk-4670symk.js";import{Uot}from"/$bunfs/root/chunk-xkp7fnwm.js";import{e}from"/$bunfs/root/chunk-kwtapczy.js";import{tbe,xWe,nbe}from"/$bunfs/root/chunk-c71n14eh.js";var s=import.meta.require("/$bunfs/root/chunk-z5hs4et9.js").ExtraUsageDialog;async function r_e(u,n){let t=_9(u);if(s&&xWe())return e(s,{onDone:t});let o=await nbe({openInBrowser:!0},n.credentials);if(o.type==="message")return t(o.value),null;if(o.type==="confirm-admin-request"){if(yt())return t(tbe),null;return e(Uot,{extraUsage:o.extraUsage,wouldTakeAnswer:()=>!0,onDone:t})}let i=Qn();if(i==="team"||i==="enterprise")return t(o.opened?`Opened ${o.url} in your browser to manage usage credits for your organization.`:`Visit ${o.url} to manage usage credits for your organization.`),null;if(!o.opened)return t(`Visit ${o.url} to manage usage credits.`),null;let r=kn(),m=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},l=ns();return e(U4,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(a,d,c)=>{let g=await x6(n,a,{setAppState:c,previousAccount:m,previousGatewayAuth:l});t(...TIe(n,a,g))}})}
export{r_e};
