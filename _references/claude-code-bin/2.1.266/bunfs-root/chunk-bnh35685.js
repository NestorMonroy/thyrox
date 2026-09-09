// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{St}from"/$bunfs/root/chunk-jvycdhmw.js";import{$t}from"/$bunfs/root/chunk-7c2v1bj6.js";function X0e(){return!St()&&$t("allow_remote_sessions")&&$t("allow_quick_web_setup")}var e={type:"local-jsx",name:"web-setup",description:"Set up Claude Code on the web with your GitHub account",availability:["claude-ai"],isEnabled:X0e,get isHidden(){return!$t("allow_remote_sessions")||!$t("allow_quick_web_setup")}},OSr=e;
export{X0e,OSr};
