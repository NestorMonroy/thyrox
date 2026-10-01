// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Zt}from"/$bunfs/root/chunk-pn8bw28z.js";import{fe}from"/$bunfs/root/chunk-sg1zq61w.js";import{qwe,c_}from"/$bunfs/root/chunk-4606bd4v.js";import{y$e}from"/$bunfs/root/chunk-0xhvdj8h.js";var n="\x1B]8;;",o="\x07";function yb(e,r,i){let t=r===void 0?void 0:Zt(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(qwe()??!0)||(i?.supportsHyperlinks??c_()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?y$e(i.themeName):!1)?fe.blue:fe.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{yb};
