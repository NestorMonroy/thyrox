// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Tbd as e}from"/$bunfs/root/_811.js";import{ncd as o}from"/$bunfs/root/_812.js";import{xxd as r}from"/$bunfs/root/_837.js";import{posix as n}from"path";function _(t){if(!t)return E;if(!s(t))throw Error("CLAUDE_STAGE_FILE_ROOT must be an absolute path");return p(t)}function a(){return _(o.CLAUDE_STAGE_FILE_ROOT)}function A(){return u(i(a()),"outputs")}var i,s,u,p,E="/mnt/user-data/uploads",f=".stage-tmp.";var g=r(()=>{e();({dirname:i,isAbsolute:s,join:u,normalize:p}=n)});
export{E as Lub,f as Mub,_ as Nub,a as Oub,A as Pub,g as Qub};
