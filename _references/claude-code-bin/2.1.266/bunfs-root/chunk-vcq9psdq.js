// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import"/$bunfs/root/chunk-t8q7n4ta.js";import"/$bunfs/root/chunk-a7esebzw.js";import"/$bunfs/root/chunk-m3k3498d.js";import"/$bunfs/root/chunk-rfvh2b8a.js";import{h}from"/$bunfs/root/chunk-jvycdhmw.js";import"/$bunfs/root/chunk-vfrpernt.js";import"/$bunfs/root/chunk-vkfaczp9.js";import"/$bunfs/root/chunk-fy3j7rz0.js";import"/$bunfs/root/chunk-qsnhycbm.js";import"/$bunfs/root/chunk-xdb7bs7g.js";import"/$bunfs/root/chunk-xj9n0xxp.js";import{Fl}from"/$bunfs/root/chunk-r34ma10f.js";import"/$bunfs/root/chunk-tw4wqy93.js";import{W6n,G6n}from"/$bunfs/root/chunk-a3rsd0xj.js";var t=new WeakMap;function i(n){try{if(n.type!=="thinking"||!n.signature)return!1;let r;if(t.has(n))r=t.get(n);else r=G6n(n.signature),t.set(n,r);return r===W6n}catch(r){if(Fl().claim("narration_classifier_error"))h(r);return!1}}function u(n){return!!n.thinking?.trim()&&i(n)}function f(n){let r=[];return n.forEach((e,s)=>{if(i(e))r.push(s)}),r}export{u as isNarrationSummaryBlock,i as isNarrationTaggedBlock,f as narrationBlockIndexes};
