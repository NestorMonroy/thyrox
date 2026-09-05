// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{ns}from"/$bunfs/root/chunk-annedm50.js";import{h}from"/$bunfs/root/chunk-e1njvp95.js";import{Xme,Xt,gt,kn}from"/$bunfs/root/chunk-hyqdn9c0.js";import{h9}from"/$bunfs/root/chunk-4hp4250a.js";import{C6,TIe,F4}from"/$bunfs/root/chunk-css07v8t.js";import{e}from"/$bunfs/root/chunk-gbn257vp.js";import{zr}from"/$bunfs/root/chunk-z91k51d2.js";function m(t){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${t}`}async function fmr(t,r){return Gae(t,r,"upgrade_command")}async function Gae(t,r,l){let u=h9(t),c=m(l);try{if(gt()){let o=Xt(),n=!1;if(o?.subscriptionType&&o?.rateLimitTier)n=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let i=await Xme(o.accessToken);n=i?.organization?.organization_type==="claude_max"&&i?.organization?.rate_limit_tier==="default_claude_max_20x"}if(n)return setTimeout(u,0,"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}await zr(c);let a=kn(),s=a&&{accountUuid:a.accountUuid,organizationUuid:a.organizationUuid},p=ns();return e(F4,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,n,i)=>{let d=await C6(r,o,{setAppState:i,previousAccount:s,previousGatewayAuth:p});u(...TIe(r,o,d))}})}catch(a){h(a),setTimeout(u,0,`Failed to open browser. Please visit ${c} to upgrade.`)}return null}
export{fmr,Gae};
