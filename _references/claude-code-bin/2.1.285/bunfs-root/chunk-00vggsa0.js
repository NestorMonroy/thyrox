// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{fe}from"/$bunfs/root/chunk-wr9nx1kq.js";import{ZSe,qy}from"/$bunfs/root/chunk-qgd52j0f.js";import{dLe}from"/$bunfs/root/chunk-5ansfsgk.js";import{Vt}from"/$bunfs/root/chunk-thv2q2wm.js";var n="\x1B]8;;",o="\x07";function nb(e,r,i){let t=r===void 0?void 0:Vt(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(ZSe()??!0)||(i?.supportsHyperlinks??qy()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?dLe(i.themeName):!1)?fe.blue:fe.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{nb};
