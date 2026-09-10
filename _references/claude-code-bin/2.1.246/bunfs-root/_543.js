// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as n}from"/$bunfs/root/_837.js";function i(t){let e=t.indexOf("."),o=(e===-1?t:t.slice(0,e)).replace(/ +$/,"");return/^(con|prn|aux|nul|com[0-9\u00B9\u00B2\u00B3]|lpt[0-9\u00B9\u00B2\u00B3])$/i.test(o)}function p(t){return s.test(t)||r.test(t)}var s,r;var c=n(()=>{s=/[.\s]+$/,r=/\.(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i});
export{s as sxb,r as txb,i as uxb,p as vxb,c as wxb};
