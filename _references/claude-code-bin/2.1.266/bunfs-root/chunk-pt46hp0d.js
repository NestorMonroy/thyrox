// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Ao}from"/$bunfs/root/chunk-t8q7n4ta.js";import{h}from"/$bunfs/root/chunk-jvycdhmw.js";import{Dhe,Jt,gt,In}from"/$bunfs/root/chunk-btbsn9s4.js";import{M6}from"/$bunfs/root/chunk-nfkb1gwg.js";import{zY,xHe,n6}from"/$bunfs/root/chunk-2c46kq0f.js";import{e}from"/$bunfs/root/chunk-zhg3ync1.js";import{qr}from"/$bunfs/root/chunk-zs929sy5.js";function m(t){return`https://claude.ai/upgrade/max?utm_source=claude_code&utm_medium=cli&utm_campaign=${t}`}async function Qbr(t,r){return kce(t,r,"upgrade_command")}async function kce(t,r,l){let u=M6(t),c=m(l);try{if(gt()){let o=Jt(),n=!1;if(o?.subscriptionType&&o?.rateLimitTier)n=o.subscriptionType==="max"&&o.rateLimitTier==="default_claude_max_20x";else if(o?.accessToken){let i=await Dhe(o.accessToken);n=i?.organization?.organization_type==="claude_max"&&i?.organization?.rate_limit_tier==="default_claude_max_20x"}if(n)return setTimeout(u,0,"You are already on the highest Max subscription plan. For additional usage, run /login to switch to an API usage-billed account."),null}await qr(c);let a=In(),s=a&&{accountUuid:a.accountUuid,organizationUuid:a.organizationUuid},p=Ao();return e(n6,{startingMessage:"Starting new login following /upgrade. Exit with Ctrl-C to use existing account.",onDone:async(o,n,i)=>{let d=await zY(r,o,{setAppState:i,previousAccount:s,previousGatewayAuth:p});u(...xHe(r,o,d))}})}catch(a){h(a),setTimeout(u,0,`Failed to open browser. Please visit ${c} to upgrade.`)}return null}
export{Qbr,kce};
