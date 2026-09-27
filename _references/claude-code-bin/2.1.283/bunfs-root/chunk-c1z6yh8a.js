// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{wo}from"/$bunfs/root/chunk-nvht7ckf.js";import{d}from"/$bunfs/root/chunk-fmsbxtrp.js";import{b$e,un,pt,Rn}from"/$bunfs/root/chunk-t6pwageh.js";import{YY}from"/$bunfs/root/chunk-12qgdt23.js";import{uue,JXe,Lre}from"/$bunfs/root/chunk-ytez97dk.js";import{e}from"/$bunfs/root/chunk-s81ftaa6.js";import{qo}from"/$bunfs/root/chunk-jsx5km52.js";function l(t){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${t}`}async function rqo(t,r){return bIe(t,r,"upgrade_command")}async function bIe(t,r,m){let u=YY(t),c=l(m);try{if(pt()){let o=un(),i=!1;if(o?.subscriptionType&&o?.rateLimitTier)i=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let n=await b$e(o.accessToken);i=n?.organization?.organization_type==="claude_max"&&n?.organization?.rate_limit_tier==="default_claude_max_20x"}if(i)return setTimeout(u,0,"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}await qo(c);let a=Rn(),s=a&&{accountUuid:a.accountUuid,organizationUuid:a.organizationUuid},p=wo();return e(Lre,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,i,n)=>{let g=await uue(r,o,{setAppState:n,previousAccount:s,previousGatewayAuth:p});u(...JXe(r,o,g))}})}catch(a){d(a),setTimeout(u,0,`Failed to open browser. Please visit ${c} to upgrade.`)}return null}
export{rqo,bIe};
