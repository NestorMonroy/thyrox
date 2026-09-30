// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{zo}from"/$bunfs/root/chunk-4qqe0nh4.js";import{d}from"/$bunfs/root/chunk-gh1pqen9.js";import{nRe,Jt,mt,xn}from"/$bunfs/root/chunk-xbd48fav.js";import{L7}from"/$bunfs/root/chunk-az8htac2.js";import{Dne,uze,pJ}from"/$bunfs/root/chunk-tcr45npq.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";import{oo}from"/$bunfs/root/chunk-ws39cvez.js";function l(t){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${t}`}async function Yto(t,r){return Mbe(t,r,"upgrade_command")}async function Mbe(t,r,m){let u=L7(t),c=l(m);try{if(mt()){let o=Jt(),i=!1;if(o?.subscriptionType&&o?.rateLimitTier)i=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let n=await nRe(o.accessToken);i=n?.organization?.organization_type==="claude_max"&&n?.organization?.rate_limit_tier==="default_claude_max_20x"}if(i)return setTimeout(u,0,"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}await oo(c);let a=xn(),s=a&&{accountUuid:a.accountUuid,organizationUuid:a.organizationUuid},p=zo();return e(pJ,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,i,n)=>{let g=await Dne(r,o,{setAppState:n,previousAccount:s,previousGatewayAuth:p});u(...uze(r,o,g))}})}catch(a){d(a),setTimeout(u,0,`Failed to open browser. Please visit ${c} to upgrade.`)}return null}
export{Yto,Mbe};
