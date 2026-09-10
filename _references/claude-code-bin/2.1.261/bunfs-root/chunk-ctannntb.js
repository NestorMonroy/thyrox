// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import"/$bunfs/root/chunk-annedm50.js";import"/$bunfs/root/chunk-dcawh0q4.js";import"/$bunfs/root/chunk-x7f60hk6.js";import"/$bunfs/root/chunk-91n3hqvz.js";import{h}from"/$bunfs/root/chunk-e1njvp95.js";import"/$bunfs/root/chunk-xzmtst7a.js";import"/$bunfs/root/chunk-2y9gqtpa.js";import"/$bunfs/root/chunk-y5pwxex8.js";import"/$bunfs/root/chunk-fvzv4ke0.js";import"/$bunfs/root/chunk-e0egp0nd.js";import"/$bunfs/root/chunk-py8dsda5.js";import{Pl}from"/$bunfs/root/chunk-yy2etnxj.js";import"/$bunfs/root/chunk-adx2tr4q.js";import{$Vn,MVn}from"/$bunfs/root/chunk-mehsxk23.js";var t=new WeakMap;function i(n){try{if(n.type!=="thinking"||!n.signature)return!1;let r;if(t.has(n))r=t.get(n);else r=MVn(n.signature),t.set(n,r);return r===$Vn}catch(r){if(Pl().claim("narration_classifier_error"))h(r);return!1}}function u(n){return!!n.thinking?.trim()&&i(n)}function f(n){let r=[];return n.forEach((e,s)=>{if(i(e))r.push(s)}),r}export{u as isNarrationSummaryBlock,i as isNarrationTaggedBlock,f as narrationBlockIndexes};
