// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{ln}from"/$bunfs/root/chunk-djetmnb8.js";import{Pt}from"/$bunfs/root/chunk-fmsbxtrp.js";import{Gc}from"/$bunfs/root/chunk-jwddn0q9.js";import{Nx,Pe}from"/$bunfs/root/chunk-4h0c4z04.js";import{S5,Xt,vf}from"/$bunfs/root/chunk-7y2gzc5g.js";var JZ={policy:"allow_remote_sessions"};function Hme(){let t=Pe();if(t!=="firstParty")return`Cloud sessions aren't available with ${Nx[t]}. They run on Anthropic's infrastructure and require an Anthropic account.`;let{featureLabel:o,verb:e}=S5(JZ.policy);return vf(JZ.policy,o,e)}function Mme(){return!Pt()&&Xt("allow_remote_sessions")&&Xt("allow_quick_web_setup")}function QZ(){return!Gc()&&Mme()}function uKe(){return`${ln().CLAUDE_AI_ORIGIN}/connect-github`}function mDe(t="this repository"){let o=uKe(),e=QZ()?`Run /web-setup to connect with your GitHub CLI login, or connect on the web at ${o}`:`Connect it on the web at ${o}`;return`GitHub isn't connected to your Claude account, so ${t} can't be cloned in the cloud. ${e}`}var n={type:"local-jsx",name:"web-setup",description:"Set up cloud sessions with your GitHub account",availability:["claude-ai"],isEnabled:Mme,policyGate:JZ,get isHidden(){return!Xt("allow_remote_sessions")||!Xt("allow_quick_web_setup")}},D3o=n;
export{JZ,Hme,Mme,QZ,uKe,mDe,D3o};
