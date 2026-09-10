// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import"/$bunfs/root/chunk-k6vqz9fa.js";import"/$bunfs/root/chunk-8a7jwk3w.js";import"/$bunfs/root/chunk-m3vzz9tz.js";import"/$bunfs/root/chunk-r8601mcq.js";import{h}from"/$bunfs/root/chunk-r1xh498w.js";import"/$bunfs/root/chunk-06whp1c5.js";import"/$bunfs/root/chunk-1m0n2kwr.js";import"/$bunfs/root/chunk-mh9y4c2z.js";import"/$bunfs/root/chunk-jmxayrtv.js";import"/$bunfs/root/chunk-w8jp0t25.js";import"/$bunfs/root/chunk-kqpqzcmv.js";import{Pl}from"/$bunfs/root/chunk-kd9zan8h.js";import"/$bunfs/root/chunk-nd7jxywt.js";import{NVn,FVn}from"/$bunfs/root/chunk-9pbb7zpe.js";var t=new WeakMap;function i(n){try{if(n.type!=="thinking"||!n.signature)return!1;let r;if(t.has(n))r=t.get(n);else r=FVn(n.signature),t.set(n,r);return r===NVn}catch(r){if(Pl().claim("narration_classifier_error"))h(r);return!1}}function u(n){return!!n.thinking?.trim()&&i(n)}function f(n){let r=[];return n.forEach((e,s)=>{if(i(e))r.push(s)}),r}export{u as isNarrationSummaryBlock,i as isNarrationTaggedBlock,f as narrationBlockIndexes};
