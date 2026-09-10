// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{pi}from"/$bunfs/root/chunk-b1z7jvb2.js";import{h}from"/$bunfs/root/chunk-hfch6q45.js";import{Pme,Jt,wt,Pn}from"/$bunfs/root/chunk-8qt7d28b.js";import{X4}from"/$bunfs/root/chunk-5qtwk945.js";import{w6,cRe,A4}from"/$bunfs/root/chunk-zgbx4h1x.js";import{e}from"/$bunfs/root/chunk-pbthxwmf.js";import{$r}from"/$bunfs/root/chunk-9htrg0bk.js";function m(t){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${t}`}async function dvr(t,r){return kae(t,r,"upgrade_command")}async function kae(t,r,l){let u=X4(t),c=m(l);try{if(wt()){let o=Jt(),n=!1;if(o?.subscriptionType&&o?.rateLimitTier)n=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let i=await Pme(o.accessToken);n=i?.organization?.organization_type==="claude_max"&&i?.organization?.rate_limit_tier==="default_claude_max_20x"}if(n)return setTimeout(u,0,"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}await $r(c);let a=Pn(),s=a&&{accountUuid:a.accountUuid,organizationUuid:a.organizationUuid},p=pi();return e(A4,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,n,i)=>{let d=await w6(r,o,{setAppState:i,previousAccount:s,previousGatewayAuth:p});u(...cRe(r,o,d))}})}catch(a){h(a),setTimeout(u,0,`Failed to open browser. Please visit ${c} to upgrade.`)}return null}
export{dvr,kae};
