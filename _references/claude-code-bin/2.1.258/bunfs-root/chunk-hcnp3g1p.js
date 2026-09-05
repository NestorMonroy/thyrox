// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{kt}from"/$bunfs/root/chunk-hfch6q45.js";import{Nt}from"/$bunfs/root/chunk-5t2y5d74.js";function pxe(){return!kt()&&Nt("allow_remote_sessions")&&Nt("allow_quick_web_setup")}var e={type:"local-jsx",name:"web-setup",description:"Set up Claude Code on the web with your GitHub account",availability:["claude-ai"],isEnabled:pxe,get isHidden(){return!Nt("allow_remote_sessions")||!Nt("allow_quick_web_setup")}},Vvr=e;
export{pxe,Vvr};
