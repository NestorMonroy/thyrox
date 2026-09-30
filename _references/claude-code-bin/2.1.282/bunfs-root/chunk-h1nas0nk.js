// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{dn}from"/$bunfs/root/chunk-d6bkh9x7.js";import{Rt}from"/$bunfs/root/chunk-xt60grfb.js";import{Hc}from"/$bunfs/root/chunk-esvkqvk3.js";import{ZR,De}from"/$bunfs/root/chunk-txvgrx83.js";import{z4,Xt,lf}from"/$bunfs/root/chunk-79j763ea.js";var SQ={policy:"allow_remote_sessions"};function Mpe(){let t=De();if(t!=="firstParty")return`Cloud sessions aren't available with ${ZR[t]}. They run on Anthropic's infrastructure and require an Anthropic account.`;let{featureLabel:o,verb:e}=z4(SQ.policy);return lf(SQ.policy,o,e)}function Dpe(){return!Rt()&&Xt("allow_remote_sessions")&&Xt("allow_quick_web_setup")}function wQ(){return!Hc()&&Dpe()}function z2e(){return`${dn().CLAUDE_AI_ORIGIN}/connect-github`}function e0e(t="this repository"){let o=z2e(),e=wQ()?`Run /web-setup to connect with your GitHub CLI login, or connect on the web at ${o}`:`Connect it on the web at ${o}`;return`GitHub isn't connected to your Claude account, so ${t} can't be cloned in the cloud. ${e}`}var n={type:"local-jsx",name:"web-setup",description:"Set up cloud sessions with your GitHub account",availability:["claude-ai"],isEnabled:Dpe,policyGate:SQ,get isHidden(){return!Xt("allow_remote_sessions")||!Xt("allow_quick_web_setup")}},N1o=n;
export{SQ,Mpe,Dpe,wQ,z2e,e0e,N1o};
