// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{yi}from"/$bunfs/root/chunk-x1rrg5j2.js";import{St,Ln,er}from"/$bunfs/root/chunk-x722nt0q.js";import{N9}from"/$bunfs/root/chunk-9bm3jpvn.js";import{nY,xxe,n9}from"/$bunfs/root/chunk-xa3pxnf6.js";import{nit}from"/$bunfs/root/chunk-eawgw36a.js";import{e}from"/$bunfs/root/chunk-g3erx2ps.js";import{Hbe,uVe,wbe}from"/$bunfs/root/chunk-03zqew4y.js";var s=import.meta.require("/$bunfs/root/chunk-7n2qsta0.js").ExtraUsageDialog;async function H_e(u,n){let t=N9(u);if(s&&uVe())return e(s,{onDone:t});let o=await wbe({openInBrowser:!0},n.credentials);if(o.type==="message")return t(o.value),null;if(o.type==="confirm-admin-request"){if(St())return t(Hbe),null;return e(nit,{extraUsage:o.extraUsage,wouldTakeAnswer:()=>!0,onDone:t})}let i=er();if(i==="team"||i==="enterprise")return t(o.opened?`Opened ${o.url} in your browser to manage usage credits for your organization.`:`Visit ${o.url} to manage usage credits for your organization.`),null;if(!o.opened)return t(`Visit ${o.url} to manage usage credits.`),null;let r=Ln(),m=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},l=yi();return e(n9,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(a,d,c)=>{let g=await nY(n,a,{setAppState:c,previousAccount:m,previousGatewayAuth:l});t(...xxe(n,a,g))}})}
export{H_e};
