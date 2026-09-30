// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Xt}from"/$bunfs/root/chunk-hxy982f9.js";import{kt}from"/$bunfs/root/chunk-b565vq97.js";import{Dc}from"/$bunfs/root/chunk-esk1bxsv.js";import{oT,He}from"/$bunfs/root/chunk-zsdbd62x.js";import{qZ,Yt,Rf}from"/$bunfs/root/chunk-vh7s70pn.js";var u8={policy:"allow_remote_sessions"};function dse(){let t=He();if(t!=="firstParty")return`Cloud sessions aren't available with ${oT[t]}. They run on Anthropic's infrastructure and require an Anthropic account.`;let{featureLabel:o,verb:e}=qZ(u8.policy);return Rf(u8.policy,o,e)}function pse(){return!kt()&&Yt("allow_remote_sessions")&&Yt("allow_quick_web_setup")}function bfe(){return!Dc()&&pse()}function gLe(){return`${Xt().CLAUDE_AI_ORIGIN}/connect-github`}function hLe(t="this repository"){let o=gLe(),e=bfe()?`Run /web-setup to connect with your GitHub CLI login, or connect on the web at ${o}`:`Connect it on the web at ${o}`;return`GitHub isn't connected to your Claude account, so ${t} can't be cloned in the cloud. ${e}`}var n={type:"local-jsx",name:"web-setup",description:"Set up cloud sessions with your GitHub account",availability:["claude-ai"],isEnabled:pse,policyGate:u8,get isHidden(){return!Yt("allow_remote_sessions")||!Yt("allow_quick_web_setup")}},GQr=n;
export{u8,dse,pse,bfe,gLe,hLe,GQr};
