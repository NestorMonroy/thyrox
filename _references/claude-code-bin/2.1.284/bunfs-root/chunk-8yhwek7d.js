// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{o,k,H,u}from"/$bunfs/root/chunk-fwjxbyrt.js";var c=f(()=>u({file_uuid:o(),file_name:o(),is_image:H().nullish(),sha256:o().nullish().catch(null),file_size:k().nullish().catch(void 0)}));function iZ(t){if(typeof t!=="object"||t===null||!("file_attachments"in t))return[];let e=t.file_attachments;if(!Array.isArray(e))return[];let a=c();return e.flatMap((r)=>{let n=a.safeParse(r);return n.success?[n.data]:[]})}
export{iZ};
