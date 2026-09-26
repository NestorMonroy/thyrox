// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{x,qu}from"/$bunfs/root/chunk-wbbthbh9.js";import{qd,ms,VDe,kRr}from"/$bunfs/root/chunk-t2wg00r4.js";var o="tengu_violin_soundpost";async function b_t(){try{return await qd()&&await qu(o)}catch{return!1}}async function nYr(){if(await b_t())return"on";if(VDe()||kRr(o))return"switched_off";throw Error("attach sync flag unknown just now")}function O1e(){try{return ms()&&x(o,!1)}catch{return!1}}
export{b_t,nYr,O1e};
