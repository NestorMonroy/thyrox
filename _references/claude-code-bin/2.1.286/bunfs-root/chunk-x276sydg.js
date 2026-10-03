// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Tt,j}from"/$bunfs/root/chunk-hbjpbz2q.js";import{c}from"/$bunfs/root/chunk-dwaez71m.js";import{vo}from"/$bunfs/root/chunk-4hjp8tw4.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{p}from"/$bunfs/root/chunk-159k5j1y.js";import{L}from"/$bunfs/root/chunk-v67w5hxq.js";import{xa}from"/$bunfs/root/chunk-sygqycmd.js";import{yR,Rg,Nt}from"/$bunfs/root/chunk-22qvrdjq.js";import{o,O,u}from"/$bunfs/root/chunk-cgbfr9c2.js";var Uy="memory_list",mf="memory_read",ac="memory_write",iLo=["memory_list","memory_read","memory_write"];var zl="REPL";function gFr(){let e=new Date,t=e.getFullYear(),r=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0");return`${t}-${r}-${n}`}class i{#e;get(){return this.#e??=gFr(),this.#e}clear(){this.#e=void 0}get captured(){return this.#e!==void 0}}var U$t=new Tt(()=>new i);function hFr(e){return U$t.of(e).get()}function aLo(){return hFr(j())}function l(){return new Date().toLocaleString("en-US",{month:"long",year:"numeric"})}var s="(provided in the conversation below)",d='"standard": the normal web search: quick and cheap; right for straightforward lookups (reference facts, official pages, documentation, well-known people, places and topics) and simple follow-up lookups. "extended": a thorough, fresh search at several times the cost and latency.',m=`${Rg} takes a \`mode\`. Use "standard" by default: it is the normal search, quick and cheap. Use "extended" only when a "standard" result comes back thin, off-target or possibly outdated, or from the start for hard-to-find or niche facts, very recent events, prices and availability, and multi-step research: it is thorough and fresh but several times the cost. When you plan several searches, send them in the same turn.`,h=p(()=>u({enabled:O(),mode_description:o().optional(),system_hint:o().optional(),web_search_addendum:o().optional()}));function NYe(){if(!xa())return null;let e=h().safeParse(a.CLAUDE_CODE_WEB_SEARCH_FAST_ARG!==void 0?{enabled:a.CLAUDE_CODE_WEB_SEARCH_FAST_ARG}:vo("tengu_sleepy_shore",null));if(!e.success||!e.data.enabled)return null;let{mode_description:t,system_hint:r,web_search_addendum:n}=e.data;return{mode_description:t?.trim()?t:d,system_hint:r?.trim()?r:m,web_search_addendum:n?.trim()?n:""}}function yFr(e){return L(e)&&e.mode==="standard"&&NYe()!==null}function _Fr(e){if(!NYe())return{};return{webSearchMode:c(yFr(e)?"standard":"extended")}}function Ipn(e){let t=NYe()?.system_hint;return t&&e.some((r)=>Nt(r,Rg))?t:null}function lLo(e){return e.replace(s,l())}function cLo(e,t){if(yR({model:e,leanPrompt:t}))return`Search the web. Returns result blocks with titles and URLs. US-only.

- The current month is ${s} \u2014 use this when searching for recent information.
- \`allowed_domains\` / \`blocked_domains\` filter results.
- After answering from results, end with a "Sources:" list of the URLs you used as markdown links.`;return`
- Allows Claude to search the web and use the results to inform responses
- Provides up-to-date information for current events and recent data
- Returns search result information formatted as search result blocks, including links as markdown hyperlinks
- Use this tool for accessing information beyond Claude's knowledge cutoff
- Searches are performed automatically within a single API call

CRITICAL REQUIREMENT - You MUST follow this:
  - After answering the user's question, you MUST include a "Sources:" section at the end of your response
  - In the Sources section, list all relevant URLs from the search results as markdown hyperlinks: [Title](URL)
  - This is MANDATORY - never skip including sources in your response
  - Example format:

    [Your answer here]

    Sources:
    - [Source Title 1](https://example.com/1)
    - [Source Title 2](https://example.com/2)

Usage notes:
  - Domain filtering is supported to include or block specific websites
  - Web search is only available in the US

IMPORTANT - Use the correct year in search queries:
  - The current month is ${s}. You MUST use this year when searching for recent information, documentation, or current events.
  - Example: If the user asks for "latest React docs", search for "React documentation" with the current year, NOT last year
`}
export{Uy,mf,ac,iLo,zl,gFr,U$t,hFr,aLo,NYe,yFr,_Fr,Ipn,lLo,cLo};
