// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{J5c as d,Y5c as f}from"/$bunfs/root/_766.js";import{Etd as p,Ttd as u,mud as w}from"/$bunfs/root/_828.js";f();w();var o="claude-cli";function h(e,{allowNewlineAndTab:t=!1}={}){for(let r=0;r<e.length;r++){let n=e.charCodeAt(r);if(n<=31||n>=127&&n<=159){if(t&&(n===10||n===9))continue;return!0}}return!1}var g=/^[\w.-]+\/[\w.-]+$/,l=5000,c=4096;function E(e){if(p(e)||u(e))throw Error(`Invalid cwd in deep link: UNC / network paths are not supported, got "${e}"`);if(!e.startsWith("/")&&!/^[a-zA-Z]:[/\\]/.test(e))throw Error(`Invalid cwd in deep link: must be an absolute path, got "${e}"`);if(h(e))throw Error("Deep link cwd contains disallowed control characters");if(/(?![\u200C\u200D\uFE00-\uFE0F\u{E0100}-\u{E01EF}])[\p{Default_Ignorable_Code_Point}\u2028\u2029\u2800\uFFF9-\uFFFB\u{1D173}-\u{1D17A}]/u.test(e))throw Error("Deep link cwd contains invisible or bidirectional control characters");if(e.length>c)throw Error(`Deep link cwd exceeds ${c} characters (got ${e.length})`)}function k(e){let t=d(e).replace(/\r\n?/g,`
`);if(h(t,{allowNewlineAndTab:!0}))throw Error("Deep link query contains disallowed control characters");if(t.length>l)throw Error(`Deep link query exceeds ${l} characters (got ${t.length})`);return t}function x(e){let t=e.startsWith(`${o}://`)?e:e.startsWith(`${o}:`)?e.replace(`${o}:`,`${o}://`):null;if(!t)throw Error(`Invalid deep link: expected ${o}:// scheme, got "${e}"`);let r;try{r=new URL(t)}catch{throw Error(`Invalid deep link URL: "${e}"`)}if(r.hostname!=="open")throw Error(`Unknown deep link action: "${r.hostname}"`);let n=r.searchParams.get("cwd")??void 0,i=r.searchParams.get("repo")??void 0,a=r.searchParams.get("q");if(n)E(n);if(i&&!g.test(i))throw Error(`Invalid repo in deep link: expected "owner/repo", got "${i}"`);let s;if(a&&a.trim().length>0)s=k(a.trim());return{query:s,cwd:n,repo:i}}
export{o as Ie,E as Je,k as Ke,x as Le};
