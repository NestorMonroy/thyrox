// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Qr}from"/$bunfs/root/chunk-bxhyh54r.js";import{u}from"/$bunfs/root/chunk-hjabkkf1.js";import{EFe,ln,ut,kn,s_e}from"/$bunfs/root/chunk-f74xvn8g.js";import{F8}from"/$bunfs/root/chunk-8p9hrr80.js";import{lpe,x7e,xoe}from"/$bunfs/root/chunk-ymxf0ken.js";import{e}from"/$bunfs/root/chunk-ne6sbmea.js";import{Ko}from"/$bunfs/root/chunk-vdndhakd.js";function l(a){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${a}`}async function g6o(a,i){return EPe(a,i,"upgrade_command")}async function EPe(a,i,m){let c=F8(a),s=l(m);try{if(ut()){let o=ln(),n=!1;if(o?.subscriptionType&&o?.rateLimitTier)n=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let t=await EFe(o.accessToken);n=t?.organization?.organization_type==="claude_max"&&t?.organization?.rate_limit_tier==="default_claude_max_20x"}if(n){let t=s_e();return setTimeout(c,0,t?`You\u2019re already on the highest Max subscription plan. For additional usage, run ${t}.`:"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}}await Ko(s);let r=kn(),p=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},d=Qr();return e(xoe,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,n,t)=>{let g=await lpe(i,o,{setAppState:t,previousAccount:p,previousGatewayAuth:d});c(...x7e(i,o,g))}})}catch(r){u(r),setTimeout(c,0,`Failed to open browser. Please visit ${s} to upgrade.`)}return null}
export{g6o,EPe};
