// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import"/$bunfs/root/chunk-8zeg9165.js";import"/$bunfs/root/chunk-37s48y77.js";import{Te,Zn}from"/$bunfs/root/chunk-d37h8mav.js";import"/$bunfs/root/chunk-0pd7kjzx.js";import"/$bunfs/root/chunk-czwr6846.js";import"/$bunfs/root/chunk-31aa9k3a.js";import"/$bunfs/root/chunk-bz96yhka.js";import"/$bunfs/root/chunk-zy97v06w.js";var e={type:"local-jsx",name:"goal",description:"Set a goal Claude checks before stopping",argumentHint:"[<condition> | clear]",immediate:!0},o={type:"local",name:"goal",supportsNonInteractive:!0,thinClientDispatch:"post-text",description:"Set a goal \u2014 keep working until the condition is met",get isHidden(){return!Te()},isEnabled:()=>Te()||Zn(),load:()=>import("/$bunfs/root/chunk-15y1yht1.js")},n=e;export{n as default,o as goalNonInteractive};
