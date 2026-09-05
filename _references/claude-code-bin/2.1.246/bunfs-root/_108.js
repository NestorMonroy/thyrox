// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{ql as p}from"/$bunfs/root/_109.js";import{exa as d,oxa as h}from"/$bunfs/root/_441.js";import{LHb as m,QHb as g}from"/$bunfs/root/_574.js";import{Lvc as f,Skc as A,puc as e,vkc as a}from"/$bunfs/root/_668.js";import{nFc as i,sGc as l}from"/$bunfs/root/_701.js";import{Tbd as c}from"/$bunfs/root/_811.js";import{ncd as n}from"/$bunfs/root/_812.js";import{atd as u,gsd as r,zkd as s}from"/$bunfs/root/_826.js";u();A();f();c();l();g();h();var D="Auto mode is now Claude Code's default permission mode.",M="Auto mode lets Claude handle permission prompts automatically. Claude checks each tool call for risky actions and prompt injection before executing, runs the ones it assesses as lower-risk, and blocks the rest.",U="https://code.claude.com/docs/en/permission-modes";function k(t){let o=e();return m()&&t==="auto"&&!p(s().host)&&!a()&&!r()&&!n.CLAUDE_BRIDGE_REATTACH_SESSION&&d()&&o.hasCompletedOnboarding===!0&&!o.hasSeenAutoDefaultNotice}function x(){return!["policySettings","userSettings","flagSettings"].some((o)=>i(o)?.skipAutoPermissionPrompt===!0)&&!e().hasSeenAutoModeEntryWarning}
export{D as kl,M as ll,U as ml,k as nl,x as ol};
