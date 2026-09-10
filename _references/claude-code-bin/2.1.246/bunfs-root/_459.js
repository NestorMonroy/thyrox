// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{t8b as _}from"/$bunfs/root/_654.js";import{Pcd as i,Rcd as c}from"/$bunfs/root/_814.js";import{jhd as s,ohd as m}from"/$bunfs/root/_820.js";import{ewd as n,nwd as u}from"/$bunfs/root/_833.js";import{txd as p,xxd as d}from"/$bunfs/root/_837.js";function g(e){return o.compileErrorMessage(e)}function f(e){try{return l.default().add([e]).test("probe"),null}catch(r){return r instanceof Error?r.message:String(r)}}class a{compileErrorMessages=new Map;warnedDroppedPatterns=new Set;compileErrorMessage(e){let r=this.compileErrorMessages.get(e);if(r!==void 0)return r;let t=f(e);return this.compileErrorMessages.set(e,t),t}hasWarnedDroppedPattern(e,r){return this.warnedDroppedPatterns.has(`${e}\x00${r}`)}markDroppedPatternWarned(e,r){this.warnedDroppedPatterns.add(`${e}\x00${r}`)}reset(){this.compileErrorMessages.clear(),this.warnedDroppedPatterns.clear()}}function b(e,r){if(o.hasWarnedDroppedPattern(e,r))return;s(`[${e}] gitignore-style pattern failed to compile (${g(r)}); treating it as matching nothing: ${r}`,{level:"warn"}),i("tengu_uncompilable_ignore_pattern",{site:P[e]}),o.markDroppedPatternWarned(e,r)}function y(e,r){return e.filter((t)=>{if(g(t)===null)return!0;return b(r,t),!1})}function D(e){return e.split(/\r?\n/).filter(Boolean)}var l,o,P;var h=d(()=>{c();u();m();l=p(_(),1);o=new a,P={claudemd_rule_globs:n("claudemd_rule_globs"),skill_paths:n("skill_paths"),file_suggestions_ignore:n("file_suggestions_ignore"),worktreeinclude:n("worktreeinclude"),dir_sync_folder_ignore:n("dir_sync_folder_ignore")}});
export{g as M2a,y as N2a,D as O2a,h as P2a};
