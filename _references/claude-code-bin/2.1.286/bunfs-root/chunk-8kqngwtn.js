// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{q}from"/$bunfs/root/chunk-hbjpbz2q.js";import{e6r}from"/$bunfs/root/chunk-wk88sc60.js";import{L9e}from"/$bunfs/root/chunk-4hjp8tw4.js";var t=/^chat:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;function T_r(){let e=e6r();if(!e)return"unset";if(!t.test(e))return"malformed";return L9e()?"ignored":"used"}function o(){return T_r()==="used"?e6r():void 0}function A_r(){let e=o();return e===void 0?{key:q(),fromHost:!1}:{key:e,fromHost:!0}}function zCt(){return A_r().key}
export{T_r,A_r,zCt};
