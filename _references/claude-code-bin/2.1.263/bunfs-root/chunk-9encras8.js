// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Eb,sye}from"/$bunfs/root/chunk-k6vqz9fa.js";import"/$bunfs/root/chunk-8a7jwk3w.js";import"/$bunfs/root/chunk-m3vzz9tz.js";import"/$bunfs/root/chunk-r8601mcq.js";import{i}from"/$bunfs/root/chunk-y9tkdj4c.js";var m=async(t,o)=>{let e=!Eb();return sye(e),o.sessionState?.notifyInternalMetadataChanged({memory_toggled_off:e?!0:null}),i("tengu_memory_toggled",{toggled_off:e}),{type:"text",value:e?`Memory paused for this session \xB7 this conversation will not write or read new memories, and previously-loaded memory content should not be referenced.

Run /pause-memory again to resume.`:"Memory resumed \xB7 memory content may be referenced and new memories can be saved."}};export{m as call};
