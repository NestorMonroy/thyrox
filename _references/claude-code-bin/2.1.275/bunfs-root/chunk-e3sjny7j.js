// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import"/$bunfs/root/chunk-q7rz8cer.js";import"/$bunfs/root/chunk-aw1peprz.js";import{Te,Kn}from"/$bunfs/root/chunk-4qqe0nh4.js";import"/$bunfs/root/chunk-h401nbms.js";import"/$bunfs/root/chunk-d5d0zdsy.js";import"/$bunfs/root/chunk-gytndg57.js";import"/$bunfs/root/chunk-t2x4z9pb.js";import"/$bunfs/root/chunk-gfewy5rb.js";var e={type:"local-jsx",name:"goal",description:"Set a goal Claude checks before stopping",argumentHint:"[<condition> | clear]",immediate:!0},o={type:"local",name:"goal",supportsNonInteractive:!0,thinClientDispatch:"post-text",description:"Set a goal \u2014 keep working until the condition is met",get isHidden(){return!Te()},isEnabled:()=>Te()||Kn(),load:()=>import("/$bunfs/root/chunk-gbpb13rv.js")},n=e;export{n as default,o as goalNonInteractive};
