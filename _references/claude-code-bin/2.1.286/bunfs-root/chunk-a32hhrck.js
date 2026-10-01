// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{cn}from"/$bunfs/root/chunk-8zh80t3g.js";import{xt}from"/$bunfs/root/chunk-hqt9kt0y.js";import{Kc}from"/$bunfs/root/chunk-wk88sc60.js";import{Gb,Pe}from"/$bunfs/root/chunk-sygqycmd.js";import{vK,Kt,Nu}from"/$bunfs/root/chunk-t34f7cqf.js";var Ite={policy:"allow_remote_sessions"};function Qhe(){let t=Pe();if(t!=="firstParty")return`Cloud sessions aren't available with ${Gb[t]}. They run on Anthropic's infrastructure and require an Anthropic account.`;let{featureLabel:o,verb:e}=vK(Ite.policy);return Nu(Ite.policy,o,e)}function Zhe(){return!xt()&&Kt("allow_remote_sessions")&&Kt("allow_quick_web_setup")}function Pte(){return!Kc()&&Zhe()}function F3e(){return`${cn().CLAUDE_AI_ORIGIN}/connect-github`}function U3e(t="this repository"){let o=F3e(),e=Pte()?`Run /web-setup to connect with your GitHub CLI login, or connect on the web at ${o}`:`Connect it on the web at ${o}`;return`GitHub isn't connected to your Claude account, so ${t} can't be cloned in the cloud. ${e}`}var n={type:"local-jsx",name:"web-setup",description:"Set up cloud sessions with your GitHub account",availability:["claude-ai"],isEnabled:Zhe,policyGate:Ite,get isHidden(){return!Kt("allow_remote_sessions")||!Kt("allow_quick_web_setup")}},NZo=n;
export{Ite,Qhe,Zhe,Pte,F3e,U3e,NZo};
