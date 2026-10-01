// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{no}from"/$bunfs/root/chunk-hbjpbz2q.js";import{d}from"/$bunfs/root/chunk-hqt9kt0y.js";import{FUe,pn,ct,kn,ebe}from"/$bunfs/root/chunk-4hjp8tw4.js";import{u9}from"/$bunfs/root/chunk-e3s5xdjs.js";import{qpe,lZe,lse}from"/$bunfs/root/chunk-6s7t56d7.js";import{e}from"/$bunfs/root/chunk-9av83rwa.js";import{ms}from"/$bunfs/root/chunk-s0w6fw09.js";function s(a){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${a}`}async function XXo(a,i){return COe(a,i,"upgrade_command")}async function COe(a,i,l){let u=u9(a),c=s(l);try{if(ct()){let o=pn(),n=!1;if(o?.subscriptionType&&o?.rateLimitTier)n=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let t=await FUe(o.accessToken);n=t?.organization?.organization_type==="claude_max"&&t?.organization?.rate_limit_tier==="default_claude_max_20x"}if(n){let t=ebe();return setTimeout(u,0,t?`You\u2019re already on the highest Max subscription plan. For additional usage, run ${t}.`:"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}}await ms(c);let r=kn(),m=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},p=no();return e(lse,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,n,t)=>{let g=await qpe(i,o,{setAppState:t,previousAccount:m,previousGatewayAuth:p});u(...lZe(i,o,g))}})}catch(r){d(r),setTimeout(u,0,`Failed to open browser. Please visit ${c} to upgrade.`)}return null}
export{XXo,COe};
