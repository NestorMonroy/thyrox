// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import"/$bunfs/root/chunk-b1z7jvb2.js";import"/$bunfs/root/chunk-ycrs8y50.js";import"/$bunfs/root/chunk-y7x1gsy0.js";import"/$bunfs/root/chunk-td0fv71w.js";import{h}from"/$bunfs/root/chunk-hfch6q45.js";import"/$bunfs/root/chunk-xtc2dmbe.js";import"/$bunfs/root/chunk-mrh5xd2h.js";import"/$bunfs/root/chunk-5nyank6v.js";import"/$bunfs/root/chunk-0sa7g6pk.js";import"/$bunfs/root/chunk-pz607n7v.js";import"/$bunfs/root/chunk-ctshp37x.js";import{rc}from"/$bunfs/root/chunk-200kfka8.js";import"/$bunfs/root/chunk-zdrmx7r2.js";import{cVn,uVn}from"/$bunfs/root/chunk-s3v6qgt4.js";var t=new WeakMap;function i(r){try{if(r.type!=="thinking"||!r.signature)return!1;let n;if(t.has(r))n=t.get(r);else n=uVn(r.signature),t.set(r,n);return n===cVn}catch(n){if(rc().claim("narration_classifier_error"))h(n);return!1}}function o(r){return!!r.thinking?.trim()&&i(r)}export{o as isNarrationSummaryBlock,i as isNarrationTaggedBlock};
