// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ue}from"/$bunfs/root/chunk-5bxxc6dq.js";import{Yhe,yh}from"/$bunfs/root/chunk-pn9qwqd6.js";import{X8t}from"/$bunfs/root/chunk-4nfma80y.js";import{_t}from"/$bunfs/root/chunk-5wq5hbjb.js";var n="\x1B]8;;",o="\x07";function p_(e,r,i){let t=r===void 0?void 0:_t(r),s=t===void 0||t===e||e===`http://${t}`||e===`https://${t}`;if(!(s&&(i?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(Yhe()??!0)||(i?.supportsHyperlinks??yh()))){if(r!==void 0&&!s)return`${r} (${e})`;return e}let p=(((i?.themeName)?X8t(i.themeName):!1)?ue.blue:ue.blueBright)(r??e);return`${n}${e}${o}${p}${n}${o}`}
export{p_};
