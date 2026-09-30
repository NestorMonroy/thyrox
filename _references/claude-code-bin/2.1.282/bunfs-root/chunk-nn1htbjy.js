// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ya}from"/$bunfs/root/chunk-x80cfbm0.js";var sm={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,MOUSE_SGR_PIXELS:1016,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function cM(E){return ya(`?${E}h`)}function b1(E){return ya(`?${E}l`)}var sht=cM(sm.SYNCHRONIZED_UPDATE),DBe=b1(sm.SYNCHRONIZED_UPDATE),zKr=cM(sm.BRACKETED_PASTE),Czt=b1(sm.BRACKETED_PASTE),Rzt=cM(sm.FOCUS_EVENTS),W9e=b1(sm.FOCUS_EVENTS),GKr=cM(sm.THEME_NOTIFY),xzt=b1(sm.THEME_NOTIFY),Cx=cM(sm.CURSOR_VISIBLE),Rx=b1(sm.CURSOR_VISIBLE),z9e=cM(sm.ALT_SCREEN_CLEAR),G9e=b1(sm.ALT_SCREEN_CLEAR),Izt=b1(sm.WIN32_INPUT_MODE),S=cM(sm.MOUSE_NORMAL)+cM(sm.MOUSE_BUTTON)+cM(sm.MOUSE_ANY)+cM(sm.MOUSE_SGR),_=cM(sm.MOUSE_NORMAL)+cM(sm.MOUSE_SGR),wne=b1(sm.MOUSE_SGR)+b1(sm.MOUSE_ANY)+b1(sm.MOUSE_BUTTON)+b1(sm.MOUSE_NORMAL),VKr=cM(sm.MOUSE_SGR_PIXELS),qKr=b1(sm.MOUSE_SGR_PIXELS)+cM(sm.MOUSE_SGR);function Pzt(E){switch(E){case"full":return S;case"scroll":return _;case"off":return""}}
export{sm,cM,b1,sht,DBe,zKr,Czt,Rzt,W9e,GKr,xzt,Cx,Rx,z9e,G9e,Izt,wne,VKr,qKr,Pzt};
