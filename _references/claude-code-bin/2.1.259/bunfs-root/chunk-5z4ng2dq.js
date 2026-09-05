// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Le,Fn}from"/$bunfs/root/chunk-x1rrg5j2.js";import"/$bunfs/root/chunk-jdw11prg.js";import"/$bunfs/root/chunk-56nvyfje.js";import"/$bunfs/root/chunk-1mrhsd7s.js";var e={type:"local-jsx",name:"goal",description:"Set a goal Claude checks before stopping",argumentHint:"[<condition> | clear]",immediate:!0},o={type:"local",name:"goal",supportsNonInteractive:!0,thinClientDispatch:"post-text",description:"Set a goal \u2014 keep working until the condition is met",get isHidden(){return!Le()},isEnabled:()=>Le()||Fn(),load:()=>import("/$bunfs/root/chunk-wdr5s3zs.js")},n=e;export{n as default,o as goalNonInteractive};
