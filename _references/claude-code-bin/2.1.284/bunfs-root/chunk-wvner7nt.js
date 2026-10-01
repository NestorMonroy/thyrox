// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{po}from"/$bunfs/root/chunk-d37h8mav.js";import{d}from"/$bunfs/root/chunk-320rdak1.js";import{LFe,pn,ut,Cn,n_e}from"/$bunfs/root/chunk-swk3rjnt.js";import{O8}from"/$bunfs/root/chunk-h457hrsz.js";import{lpe,x7e,Ioe}from"/$bunfs/root/chunk-d61qpta7.js";import{e}from"/$bunfs/root/chunk-fr6qx5c3.js";import{Jo}from"/$bunfs/root/chunk-6322q80n.js";function s(a){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${a}`}async function i6o(a,i){return HIe(a,i,"upgrade_command")}async function HIe(a,i,l){let u=O8(a),c=s(l);try{if(ut()){let o=pn(),n=!1;if(o?.subscriptionType&&o?.rateLimitTier)n=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let t=await LFe(o.accessToken);n=t?.organization?.organization_type==="claude_max"&&t?.organization?.rate_limit_tier==="default_claude_max_20x"}if(n){let t=n_e();return setTimeout(u,0,t?`You\u2019re already on the highest Max subscription plan. For additional usage, run ${t}.`:"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}}await Jo(c);let r=Cn(),m=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},p=po();return e(Ioe,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,n,t)=>{let g=await lpe(i,o,{setAppState:t,previousAccount:m,previousGatewayAuth:p});u(...x7e(i,o,g))}})}catch(r){d(r),setTimeout(u,0,`Failed to open browser. Please visit ${c} to upgrade.`)}return null}
export{i6o,HIe};
