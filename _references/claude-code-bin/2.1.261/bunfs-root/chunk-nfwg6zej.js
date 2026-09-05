// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{wb,oye}from"/$bunfs/root/chunk-annedm50.js";import"/$bunfs/root/chunk-dcawh0q4.js";import"/$bunfs/root/chunk-x7f60hk6.js";import"/$bunfs/root/chunk-91n3hqvz.js";import{i}from"/$bunfs/root/chunk-838r2s0v.js";var m=async(t,o)=>{let e=!wb();return oye(e),o.sessionState?.notifyInternalMetadataChanged({memory_toggled_off:e?!0:null}),i("tengu_memory_toggled",{toggled_off:e}),{type:"text",value:e?`Memory paused for this session \xB7 this conversation will not write or read new memories, and previously-loaded memory content should not be referenced.

Run /pause-memory again to resume.`:"Memory resumed \xB7 memory content may be referenced and new memories can be saved."}};export{m as call};
