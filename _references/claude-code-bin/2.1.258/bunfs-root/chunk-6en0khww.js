// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Pe,Mn}from"/$bunfs/root/chunk-b1z7jvb2.js";import"/$bunfs/root/chunk-ycrs8y50.js";import"/$bunfs/root/chunk-y7x1gsy0.js";import"/$bunfs/root/chunk-td0fv71w.js";var e={type:"local-jsx",name:"goal",description:"Set a goal Claude checks before stopping",argumentHint:"[<condition> | clear]",immediate:!0},o={type:"local",name:"goal",supportsNonInteractive:!0,thinClientDispatch:"post-text",description:"Set a goal \u2014 keep working until the condition is met",get isHidden(){return!Pe()},isEnabled:()=>Pe()||Mn(),load:()=>import("/$bunfs/root/chunk-6ne0kt6h.js")},n=e;export{n as default,o as goalNonInteractive};
