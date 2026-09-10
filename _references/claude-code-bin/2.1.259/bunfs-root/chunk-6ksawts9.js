// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{yi}from"/$bunfs/root/chunk-x1rrg5j2.js";import{h}from"/$bunfs/root/chunk-6rkpsn9e.js";import{kge,tn,wt,Ln}from"/$bunfs/root/chunk-x722nt0q.js";import{N9}from"/$bunfs/root/chunk-9bm3jpvn.js";import{nY,xxe,n9}from"/$bunfs/root/chunk-xa3pxnf6.js";import{e}from"/$bunfs/root/chunk-g3erx2ps.js";import{Xr}from"/$bunfs/root/chunk-gmdrem8f.js";function m(t){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${t}`}async function QCr(t,r){return Sle(t,r,"upgrade_command")}async function Sle(t,r,l){let u=N9(t),c=m(l);try{if(wt()){let o=tn(),n=!1;if(o?.subscriptionType&&o?.rateLimitTier)n=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let i=await kge(o.accessToken);n=i?.organization?.organization_type==="claude_max"&&i?.organization?.rate_limit_tier==="default_claude_max_20x"}if(n)return setTimeout(u,0,"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}await Xr(c);let a=Ln(),s=a&&{accountUuid:a.accountUuid,organizationUuid:a.organizationUuid},p=yi();return e(n9,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,n,i)=>{let d=await nY(r,o,{setAppState:i,previousAccount:s,previousGatewayAuth:p});u(...xxe(r,o,d))}})}catch(a){h(a),setTimeout(u,0,`Failed to open browser. Please visit ${c} to upgrade.`)}return null}
export{QCr,Sle};
