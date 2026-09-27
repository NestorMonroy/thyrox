// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Je}from"/$bunfs/root/chunk-ckctvm5v.js";import{ES,Sa}from"/$bunfs/root/chunk-py0wn3k3.js";function CVt(){let e=Je().defaultShell;if(e==="bash"&&!Sa())return"powershell";if(e==="powershell"&&!ES())return"bash";return e??(Sa()?"bash":"powershell")}
export{CVt};
