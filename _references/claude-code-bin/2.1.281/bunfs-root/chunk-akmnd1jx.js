// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ma}from"/$bunfs/root/chunk-a22am1vw.js";var em={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,MOUSE_SGR_PIXELS:1016,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function L0(E){return ma(`?${E}h`)}function qB(E){return ma(`?${E}l`)}var umt=L0(em.SYNCHRONIZED_UPDATE),sUe=qB(em.SYNCHRONIZED_UPDATE),J2r=L0(em.BRACKETED_PASTE),H1t=qB(em.BRACKETED_PASTE),O1t=L0(em.FOCUS_EVENTS),p8e=qB(em.FOCUS_EVENTS),Q2r=L0(em.THEME_NOTIFY),M1t=qB(em.THEME_NOTIFY),dx=L0(em.CURSOR_VISIBLE),ux=qB(em.CURSOR_VISIBLE),f8e=L0(em.ALT_SCREEN_CLEAR),m8e=qB(em.ALT_SCREEN_CLEAR),D1t=qB(em.WIN32_INPUT_MODE),S=L0(em.MOUSE_NORMAL)+L0(em.MOUSE_BUTTON)+L0(em.MOUSE_ANY)+L0(em.MOUSE_SGR),_=L0(em.MOUSE_NORMAL)+L0(em.MOUSE_SGR),Cte=qB(em.MOUSE_SGR)+qB(em.MOUSE_ANY)+qB(em.MOUSE_BUTTON)+qB(em.MOUSE_NORMAL),Z2r=L0(em.MOUSE_SGR_PIXELS),eGr=qB(em.MOUSE_SGR_PIXELS)+L0(em.MOUSE_SGR);function L1t(E){switch(E){case"full":return S;case"scroll":return _;case"off":return""}}
export{em,L0,qB,umt,sUe,J2r,H1t,O1t,p8e,Q2r,M1t,dx,ux,f8e,m8e,D1t,Cte,Z2r,eGr,L1t};
