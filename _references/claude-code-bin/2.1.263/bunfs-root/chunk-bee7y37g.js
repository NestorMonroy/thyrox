// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{bt}from"/$bunfs/root/chunk-r1xh498w.js";import{Mt}from"/$bunfs/root/chunk-bfe59bf9.js";function Vxe(){return!bt()&&Mt("allow_remote_sessions")&&Mt("allow_quick_web_setup")}var e={type:"local-jsx",name:"web-setup",description:"Set up Claude Code on the web with your GitHub account",availability:["claude-ai"],isEnabled:Vxe,get isHidden(){return!Mt("allow_remote_sessions")||!Mt("allow_quick_web_setup")}},Xmr=e;
export{Vxe,Xmr};
