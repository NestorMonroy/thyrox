// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as r}from"/$bunfs/root/_837.js";class i{hooks=null;uiMounted=!1;setHooks(e){this.hooks=e}setUiMounted(e){this.uiMounted=e}}function h(e){n.setHooks(e)}function v(){return n.hooks}function s(e){n.setUiMounted(e)}function d(){return n.uiMounted}var n;var u=r(()=>{n=new i});var l,a,c;var m=r(()=>{u();l=class l extends Map{get everMounted(){return d()}set everMounted(e){s(e)}set(e,o){return this.everMounted=!0,super.set(e,o)}standaloneRender=null;claimForStandaloneRender(e){let o=()=>{if(this.standaloneRender===t)this.standaloneRender=null},t=e.then(o,o);this.standaloneRender=t}get pendingStandaloneRender(){return this.standaloneRender}};a=new l,c=a});
export{h as Mbb,v as Nbb,d as Obb,u as Pbb,c as Qbb,m as Rbb};
