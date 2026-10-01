// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{jt}from"/$bunfs/root/chunk-k6n2tyj0.js";var u=7000,c=256;function GQ(n){return n.reduce((e,r)=>{let t=h(r),s=e.chunks.at(-1);if(s===void 0||s.length>=c||e.bytes+t>u)return e.chunks.push([r]),{chunks:e.chunks,bytes:t};return s.push(r),{chunks:e.chunks,bytes:e.bytes+t}},{chunks:[],bytes:0}).chunks}var o=/[()[\]%!^"`<>&|;, *?]/g;function h(n){return Buffer.byteLength(n)+5+jt(n,'"')+jt(n,"\\")+(n.match(o)?.length??0)}
export{GQ};
