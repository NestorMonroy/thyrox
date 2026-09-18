// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Yt}from"/$bunfs/root/chunk-ebf04mp3.js";import{Ct}from"/$bunfs/root/chunk-gh1pqen9.js";import{Yl}from"/$bunfs/root/chunk-1d5n9rp4.js";import{DT,He}from"/$bunfs/root/chunk-ffayvr1z.js";import{Bee,Vt,Nf}from"/$bunfs/root/chunk-96tx2e97.js";var rY={policy:"allow_remote_sessions"};function pie(){let t=He();if(t!=="firstParty")return`Cloud sessions aren't available with ${DT[t]}. They run on Anthropic's infrastructure and require an Anthropic account.`;let{featureLabel:o,verb:e}=Bee(rY.policy);return Nf(rY.policy,o,e)}function fie(){return!Ct()&&Vt("allow_remote_sessions")&&Vt("allow_quick_web_setup")}function Pme(){return!Yl()&&fie()}function a$e(){return`${Yt().CLAUDE_AI_ORIGIN}/connect-github`}function l$e(t="this repository"){let o=a$e(),e=Pme()?`Run /web-setup to connect with your GitHub CLI login, or connect on the web at ${o}`:`Connect it on the web at ${o}`;return`GitHub isn't connected to your Claude account, so ${t} can't be cloned in the cloud. ${e}`}var n={type:"local-jsx",name:"web-setup",description:"Set up cloud sessions with your GitHub account",availability:["claude-ai"],isEnabled:fie,policyGate:rY,get isHidden(){return!Vt("allow_remote_sessions")||!Vt("allow_quick_web_setup")}},Iso=n;
export{rY,pie,fie,Pme,a$e,l$e,Iso};
