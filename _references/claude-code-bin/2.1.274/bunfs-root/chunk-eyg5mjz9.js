// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{jo}from"/$bunfs/root/chunk-ja309z9r.js";import{d}from"/$bunfs/root/chunk-b565vq97.js";import{CTe,Qt,St,Mn}from"/$bunfs/root/chunk-27bj2wbx.js";import{ZJ}from"/$bunfs/root/chunk-fgs23952.js";import{Hte,fje,xX}from"/$bunfs/root/chunk-46z0b6ja.js";import{e}from"/$bunfs/root/chunk-kd9k0apc.js";import{uo}from"/$bunfs/root/chunk-zwapye6j.js";function l(t){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${t}`}async function mXr(t,r){return l_e(t,r,"upgrade_command")}async function l_e(t,r,m){let u=ZJ(t),c=l(m);try{if(St()){let o=Qt(),i=!1;if(o?.subscriptionType&&o?.rateLimitTier)i=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let n=await CTe(o.accessToken);i=n?.organization?.organization_type==="claude_max"&&n?.organization?.rate_limit_tier==="default_claude_max_20x"}if(i)return setTimeout(u,0,"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}await uo(c);let a=Mn(),s=a&&{accountUuid:a.accountUuid,organizationUuid:a.organizationUuid},p=jo();return e(xX,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,i,n)=>{let g=await Hte(r,o,{setAppState:n,previousAccount:s,previousGatewayAuth:p});u(...fje(r,o,g))}})}catch(a){d(a),setTimeout(u,0,`Failed to open browser. Please visit ${c} to upgrade.`)}return null}
export{mXr,l_e};
