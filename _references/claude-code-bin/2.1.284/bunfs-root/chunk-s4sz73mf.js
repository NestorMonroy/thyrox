// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Je}from"/$bunfs/root/chunk-r03mjfax.js";import{GS,Ca}from"/$bunfs/root/chunk-q3brtb9y.js";function r4t(){let e=Je().defaultShell;if(e==="bash"&&!Ca())return"powershell";if(e==="powershell"&&!GS())return"bash";return e??(Ca()?"bash":"powershell")}
export{r4t};
