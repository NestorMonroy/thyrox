// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{ln}from"/$bunfs/root/chunk-yr0jgjsq.js";import{Ct}from"/$bunfs/root/chunk-320rdak1.js";import{qc}from"/$bunfs/root/chunk-2rw92xpq.js";import{lT,Ie}from"/$bunfs/root/chunk-12vsw1j8.js";import{Z3,Qt,Rf}from"/$bunfs/root/chunk-26awea5d.js";var Mee={policy:"allow_remote_sessions"};function xge(){let t=Ie();if(t!=="firstParty")return`Cloud sessions aren't available with ${lT[t]}. They run on Anthropic's infrastructure and require an Anthropic account.`;let{featureLabel:o,verb:e}=Z3(Mee.policy);return Rf(Mee.policy,o,e)}function Pge(){return!Ct()&&Qt("allow_remote_sessions")&&Qt("allow_quick_web_setup")}function Dee(){return!qc()&&Pge()}function N4e(){return`${ln().CLAUDE_AI_ORIGIN}/connect-github`}function ALe(t="this repository"){let o=N4e(),e=Dee()?`Run /web-setup to connect with your GitHub CLI login, or connect on the web at ${o}`:`Connect it on the web at ${o}`;return`GitHub isn't connected to your Claude account, so ${t} can't be cloned in the cloud. ${e}`}var n={type:"local-jsx",name:"web-setup",description:"Set up cloud sessions with your GitHub account",availability:["claude-ai"],isEnabled:Pge,policyGate:Mee,get isHidden(){return!Qt("allow_remote_sessions")||!Qt("allow_quick_web_setup")}},F9o=n;
export{Mee,xge,Pge,Dee,N4e,ALe,F9o};
