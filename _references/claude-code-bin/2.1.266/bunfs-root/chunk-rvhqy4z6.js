// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Re,Ln}from"/$bunfs/root/chunk-t8q7n4ta.js";import"/$bunfs/root/chunk-a7esebzw.js";import"/$bunfs/root/chunk-m3k3498d.js";import"/$bunfs/root/chunk-rfvh2b8a.js";var e={type:"local-jsx",name:"goal",description:"Set a goal Claude checks before stopping",argumentHint:"[<condition> | clear]",immediate:!0},o={type:"local",name:"goal",supportsNonInteractive:!0,thinClientDispatch:"post-text",description:"Set a goal \u2014 keep working until the condition is met",get isHidden(){return!Re()},isEnabled:()=>Re()||Ln(),load:()=>import("/$bunfs/root/chunk-nyhx721z.js")},n=e;export{n as default,o as goalNonInteractive};
