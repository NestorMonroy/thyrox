// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{z,B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";var e={allowRules:[],denyRules:[],sessionDenyRules:[],toolsNarrowingDenyRules:[],additionalWorkingDirectories:new Map,launchedInAutoMode:!1};class t{snapshot=e;get(){return this.snapshot}publish(o){let s=a.CLAUDE_CODE_SESSION_KIND==="bg";this.snapshot={allowRules:s?[]:[...o.alwaysAllowRules.cliArg??[]],denyRules:[...o.alwaysDenyRules.cliArg??[]],sessionDenyRules:[...o.alwaysDenyRules.session??[]],toolsNarrowingDenyRules:[...o.alwaysDenyRules.toolsNarrowing??[]],additionalWorkingDirectories:new Map(s?[...o.additionalWorkingDirectories].filter(([,n])=>n.source==="session"):o.additionalWorkingDirectories),launchedInAutoMode:o.mode==="auto"}}reset(){this.snapshot=e}}var i=new z(()=>new t);function r(){return i.of(B().host)}function s2n(o){r().publish(o)}
export{s2n};
