// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{fe}from"/$bunfs/root/chunk-h9xec3e4.js";import{twe,qy}from"/$bunfs/root/chunk-9nas721b.js";import{Eon}from"/$bunfs/root/chunk-k7mkzvfg.js";import{Et}from"/$bunfs/root/chunk-3xxkkv4v.js";var n="\x1B]8;;",o="\x07";function nb(e,r,i){let t=r===void 0?void 0:Et(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(twe()??!0)||(i?.supportsHyperlinks??qy()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?Eon(i.themeName):!1)?fe.blue:fe.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{nb};
