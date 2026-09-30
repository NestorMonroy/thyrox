// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{de}from"/$bunfs/root/chunk-gw27mnrz.js";import{Iue,fg}from"/$bunfs/root/chunk-00x9j2xt.js";import{Xjt}from"/$bunfs/root/chunk-0qq5n111.js";import{_t}from"/$bunfs/root/chunk-75n2g1wh.js";var n="\x1B]8;;",o="\x07";function ty(e,r,i){let t=r===void 0?void 0:_t(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(Iue()??!0)||(i?.supportsHyperlinks??fg()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?Xjt(i.themeName):!1)?de.blue:de.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{ty};
