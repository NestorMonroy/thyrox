// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ho}from"/$bunfs/root/chunk-cqc88nqm.js";import{xn,tr,Tt}from"/$bunfs/root/chunk-5khn4tvf.js";import{une}from"/$bunfs/root/chunk-2q9stn7q.js";import{yle,tYe,Zee}from"/$bunfs/root/chunk-gkr2php9.js";import{i$t}from"/$bunfs/root/chunk-w2fmk2zk.js";import{e}from"/$bunfs/root/chunk-srmsc891.js";import{LUe,Rgt,NUe}from"/$bunfs/root/chunk-dn2835re.js";var s=import.meta.require("/$bunfs/root/chunk-dt2s7ays.js").ExtraUsageDialog;async function tFe(u,n){let t=une(u);if(s&&Rgt())return e(s,{onDone:t});let o=await NUe({openInBrowser:!0},n.credentials);if(o.type==="message")return t(o.value),null;if(o.type==="confirm-admin-request"){if(Tt())return t(LUe),null;return e(i$t,{extraUsage:o.extraUsage,wouldTakeAnswer:()=>!0,onDone:t})}let i=tr();if(i==="team"||i==="enterprise")return t(o.opened?`Opened ${o.url} in your browser to manage usage credits for your organization.`:`Visit ${o.url} to manage usage credits for your organization.`),null;if(!o.opened)return t(`Visit ${o.url} to manage usage credits.`),null;let r=xn(),l=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},g=ho();return e(Zee,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(a,d,m)=>{let c=await yle(n,a,{setAppState:m,previousAccount:l,previousGatewayAuth:g});t(...tYe(n,a,c))}})}
export{tFe};
