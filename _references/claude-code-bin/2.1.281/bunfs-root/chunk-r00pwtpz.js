// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{dn}from"/$bunfs/root/chunk-dqhw8yqd.js";import{xt}from"/$bunfs/root/chunk-0n80jtth.js";import{$c}from"/$bunfs/root/chunk-wckxjewz.js";import{FR,He}from"/$bunfs/root/chunk-6r1h1xyw.js";import{c4,Xt,Zp}from"/$bunfs/root/chunk-649gsb4b.js";var g7={policy:"allow_remote_sessions"};function Pue(){let t=He();if(t!=="firstParty")return`Cloud sessions aren't available with ${FR[t]}. They run on Anthropic's infrastructure and require an Anthropic account.`;let{featureLabel:o,verb:e}=c4(g7.policy);return Zp(g7.policy,o,e)}function Hue(){return!xt()&&Xt("allow_remote_sessions")&&Xt("allow_quick_web_setup")}function h7(){return!$c()&&Hue()}function iGe(){return`${dn().CLAUDE_AI_ORIGIN}/connect-github`}function fHe(t="this repository"){let o=iGe(),e=h7()?`Run /web-setup to connect with your GitHub CLI login, or connect on the web at ${o}`:`Connect it on the web at ${o}`;return`GitHub isn't connected to your Claude account, so ${t} can't be cloned in the cloud. ${e}`}var n={type:"local-jsx",name:"web-setup",description:"Set up cloud sessions with your GitHub account",availability:["claude-ai"],isEnabled:Hue,policyGate:g7,get isHidden(){return!Xt("allow_remote_sessions")||!Xt("allow_quick_web_setup")}},iNo=n;
export{g7,Pue,Hue,h7,iGe,fHe,iNo};
