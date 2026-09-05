// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as n}from"/$bunfs/root/_837.js";function o(e){return e.normalize("NFC").replace(/[. ]+$/,"").toLowerCase()}function l(e){let r=e.split("/");if(r.length===0)return!0;if(r.some((t)=>t.startsWith(".")))return!0;return s.includes(o(r[0]))}var s;var i=n(()=>{s=["team","logs","sessions","proposals"]});
export{s as kib,o as lib,l as mib,i as nib};
