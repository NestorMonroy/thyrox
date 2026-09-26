// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{yo}from"/$bunfs/root/chunk-zwm3fybx.js";import{u}from"/$bunfs/root/chunk-xt60grfb.js";import{sLe,pn,gt,In}from"/$bunfs/root/chunk-wbbthbh9.js";import{lre}from"/$bunfs/root/chunk-gbyvx6y7.js";import{bce,O8e,Xte}from"/$bunfs/root/chunk-dw91q9vs.js";import{e}from"/$bunfs/root/chunk-rygnxyqy.js";import{$o}from"/$bunfs/root/chunk-a5829739.js";function m(t){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${t}`}async function sFo(t,r){return cRe(t,r,"upgrade_command")}async function cRe(t,r,s){let c=lre(t),l=m(s);try{if(gt()){let o=pn(),i=!1;if(o?.subscriptionType&&o?.rateLimitTier)i=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let n=await sLe(o.accessToken);i=n?.organization?.organization_type==="claude_max"&&n?.organization?.rate_limit_tier==="default_claude_max_20x"}if(i)return setTimeout(c,0,"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}await $o(l);let a=In(),p=a&&{accountUuid:a.accountUuid,organizationUuid:a.organizationUuid},d=yo();return e(Xte,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,i,n)=>{let g=await bce(r,o,{setAppState:n,previousAccount:p,previousGatewayAuth:d});c(...O8e(r,o,g))}})}catch(a){u(a),setTimeout(c,0,`Failed to open browser. Please visit ${l} to upgrade.`)}return null}
export{sFo,cRe};
