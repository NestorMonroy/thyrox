// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ho}from"/$bunfs/root/chunk-cqc88nqm.js";import{u}from"/$bunfs/root/chunk-0n80jtth.js";import{PMe,un,pt,xn}from"/$bunfs/root/chunk-5khn4tvf.js";import{une}from"/$bunfs/root/chunk-2q9stn7q.js";import{yle,tYe,Zee}from"/$bunfs/root/chunk-gkr2php9.js";import{e}from"/$bunfs/root/chunk-srmsc891.js";import{Do}from"/$bunfs/root/chunk-43jmj9wd.js";function m(t){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${t}`}async function H0o(t,r){return BAe(t,r,"upgrade_command")}async function BAe(t,r,s){let c=une(t),l=m(s);try{if(pt()){let o=un(),i=!1;if(o?.subscriptionType&&o?.rateLimitTier)i=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let n=await PMe(o.accessToken);i=n?.organization?.organization_type==="claude_max"&&n?.organization?.rate_limit_tier==="default_claude_max_20x"}if(i)return setTimeout(c,0,"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}await Do(l);let a=xn(),p=a&&{accountUuid:a.accountUuid,organizationUuid:a.organizationUuid},d=ho();return e(Zee,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,i,n)=>{let g=await yle(r,o,{setAppState:n,previousAccount:p,previousGatewayAuth:d});c(...tYe(r,o,g))}})}catch(a){u(a),setTimeout(c,0,`Failed to open browser. Please visit ${l} to upgrade.`)}return null}
export{H0o,BAe};
