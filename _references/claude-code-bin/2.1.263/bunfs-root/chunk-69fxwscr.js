// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{ns}from"/$bunfs/root/chunk-k6vqz9fa.js";import{h}from"/$bunfs/root/chunk-r1xh498w.js";import{Jme,Xt,gt,kn}from"/$bunfs/root/chunk-32f2qmtc.js";import{_9}from"/$bunfs/root/chunk-2c0zm87n.js";import{x6,TIe,U4}from"/$bunfs/root/chunk-4670symk.js";import{e}from"/$bunfs/root/chunk-kwtapczy.js";import{zr}from"/$bunfs/root/chunk-fp31c615.js";function m(t){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${t}`}async function gmr(t,r){return zae(t,r,"upgrade_command")}async function zae(t,r,l){let u=_9(t),c=m(l);try{if(gt()){let o=Xt(),n=!1;if(o?.subscriptionType&&o?.rateLimitTier)n=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let i=await Jme(o.accessToken);n=i?.organization?.organization_type==="claude_max"&&i?.organization?.rate_limit_tier==="default_claude_max_20x"}if(n)return setTimeout(u,0,"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}await zr(c);let a=kn(),s=a&&{accountUuid:a.accountUuid,organizationUuid:a.organizationUuid},p=ns();return e(U4,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,n,i)=>{let d=await x6(r,o,{setAppState:i,previousAccount:s,previousGatewayAuth:p});u(...TIe(r,o,d))}})}catch(a){h(a),setTimeout(u,0,`Failed to open browser. Please visit ${c} to upgrade.`)}return null}
export{gmr,zae};
