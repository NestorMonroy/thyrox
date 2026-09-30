// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{yo}from"/$bunfs/root/chunk-zwm3fybx.js";import{In,rr,Et}from"/$bunfs/root/chunk-wbbthbh9.js";import{lre}from"/$bunfs/root/chunk-gbyvx6y7.js";import{bce,O8e,Xte}from"/$bunfs/root/chunk-dw91q9vs.js";import{WUt}from"/$bunfs/root/chunk-g2y2cnt3.js";import{e}from"/$bunfs/root/chunk-rygnxyqy.js";import{u1e,Syt,p1e}from"/$bunfs/root/chunk-30qqx8wm.js";var s=import.meta.require("/$bunfs/root/chunk-m5mmwed2.js").ExtraUsageDialog;async function AUe(u,n){let t=lre(u);if(s&&Syt())return e(s,{onDone:t});let o=await p1e({openInBrowser:!0},n.credentials);if(o.type==="message")return t(o.value),null;if(o.type==="confirm-admin-request"){if(Et())return t(u1e),null;return e(WUt,{extraUsage:o.extraUsage,wouldTakeAnswer:()=>!0,onDone:t})}let i=rr();if(i==="team"||i==="enterprise")return t(o.opened?`Opened ${o.url} in your browser to manage usage credits for your organization.`:`Visit ${o.url} to manage usage credits for your organization.`),null;if(!o.opened)return t(`Visit ${o.url} to manage usage credits.`),null;let r=In(),l=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},g=yo();return e(Xte,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(a,d,m)=>{let c=await bce(n,a,{setAppState:m,previousAccount:l,previousGatewayAuth:g});t(...O8e(n,a,c))}})}
export{AUe};
