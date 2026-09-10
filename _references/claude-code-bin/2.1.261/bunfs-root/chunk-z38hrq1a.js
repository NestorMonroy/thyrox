// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{ve}from"/$bunfs/root/chunk-934z9d80.js";import{createRequire as t}from"module";import{fileURLToPath as n}from"url";import{dirname as s,join as f}from"path";var r=null;function u(e){return typeof e==="object"&&e!==null&&"getModifiers"in e&&typeof e.getModifiers==="function"&&"isModifierPressed"in e&&typeof e.isModifierPressed==="function"}function o(){if(r)return r;return null}function c(e){let i=o();if(!i)return!1;try{return i.isModifierPressed(e)}catch{return!1}}function p(){o()}export{c as isModifierPressed,p as prewarm};
