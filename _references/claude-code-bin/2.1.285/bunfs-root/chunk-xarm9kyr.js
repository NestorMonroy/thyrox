// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{sn}from"/$bunfs/root/chunk-vtytg7jt.js";import{kt}from"/$bunfs/root/chunk-hjabkkf1.js";import{jc}from"/$bunfs/root/chunk-gph9jdam.js";import{xb,Ie}from"/$bunfs/root/chunk-n2v4180x.js";import{i6,Yt,Pu}from"/$bunfs/root/chunk-t5hhxe3x.js";var Lee={policy:"allow_remote_sessions"};function Mge(){let t=Ie();if(t!=="firstParty")return`Cloud sessions aren't available with ${xb[t]}. They run on Anthropic's infrastructure and require an Anthropic account.`;let{featureLabel:o,verb:e}=i6(Lee.policy);return Pu(Lee.policy,o,e)}function Dge(){return!kt()&&Yt("allow_remote_sessions")&&Yt("allow_quick_web_setup")}function Nee(){return!jc()&&Dge()}function R4e(){return`${sn().CLAUDE_AI_ORIGIN}/connect-github`}function x4e(t="this repository"){let o=R4e(),e=Nee()?`Run /web-setup to connect with your GitHub CLI login, or connect on the web at ${o}`:`Connect it on the web at ${o}`;return`GitHub isn't connected to your Claude account, so ${t} can't be cloned in the cloud. ${e}`}var n={type:"local-jsx",name:"web-setup",description:"Set up cloud sessions with your GitHub account",availability:["claude-ai"],isEnabled:Dge,policyGate:Lee,get isHidden(){return!Yt("allow_remote_sessions")||!Yt("allow_quick_web_setup")}},J9o=n;
export{Lee,Mge,Dge,Nee,R4e,x4e,J9o};
