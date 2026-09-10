// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Je}from"/$bunfs/root/chunk-67nd7etf.js";import{sI,us}from"/$bunfs/root/chunk-40xnyyhy.js";function nat(){let e=Je().defaultShell;if(e==="bash"&&!us())return"powershell";if(e==="powershell"&&!sI())return"bash";return e??(us()?"bash":"powershell")}
export{nat};
