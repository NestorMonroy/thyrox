// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{ie}from"/$bunfs/root/chunk-71zhb9jr.js";import{ree,Hp}from"/$bunfs/root/chunk-gj9a7h14.js";import{Cbt}from"/$bunfs/root/chunk-mhx71bd6.js";import{ft}from"/$bunfs/root/chunk-te0qwtpy.js";var n="\x1B]8;;",o="\x07";function Jg(e,r,i){let t=r===void 0?void 0:ft(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(ree()??!0)||(i?.supportsHyperlinks??Hp()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?Cbt(i.themeName):!1)?ie.blue:ie.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{Jg};
