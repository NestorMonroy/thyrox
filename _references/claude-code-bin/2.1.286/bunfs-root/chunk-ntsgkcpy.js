// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Pa}from"/$bunfs/root/chunk-abdftc9s.js";var Dm={CURSOR_VISIBLE:25,ALT_SCREEN:47,ALT_SCREEN_CLEAR:1049,MOUSE_NORMAL:1000,MOUSE_BUTTON:1002,MOUSE_ANY:1003,MOUSE_SGR:1006,MOUSE_SGR_PIXELS:1016,FOCUS_EVENTS:1004,BRACKETED_PASTE:2004,THEME_NOTIFY:2031,SYNCHRONIZED_UPDATE:2026,WIN32_INPUT_MODE:9001};function iL(E){return Pa(`?${E}h`)}function LW(E){return Pa(`?${E}l`)}var Ovt=iL(Dm.SYNCHRONIZED_UPDATE),gGe=LW(Dm.SYNCHRONIZED_UPDATE),jno=iL(Dm.BRACKETED_PASTE),Y5t=LW(Dm.BRACKETED_PASTE),X5t=iL(Dm.FOCUS_EVENTS),iet=LW(Dm.FOCUS_EVENTS),Wno=iL(Dm.THEME_NOTIFY),J5t=LW(Dm.THEME_NOTIFY),HI=iL(Dm.CURSOR_VISIBLE),DI=LW(Dm.CURSOR_VISIBLE),aet=iL(Dm.ALT_SCREEN_CLEAR),cet=LW(Dm.ALT_SCREEN_CLEAR),Q5t=LW(Dm.WIN32_INPUT_MODE),S=iL(Dm.MOUSE_NORMAL)+iL(Dm.MOUSE_BUTTON)+iL(Dm.MOUSE_ANY)+iL(Dm.MOUSE_SGR),_=iL(Dm.MOUSE_NORMAL)+iL(Dm.MOUSE_SGR),Ise=LW(Dm.MOUSE_SGR)+LW(Dm.MOUSE_ANY)+LW(Dm.MOUSE_BUTTON)+LW(Dm.MOUSE_NORMAL),zno=iL(Dm.MOUSE_SGR_PIXELS),Gno=LW(Dm.MOUSE_SGR_PIXELS)+iL(Dm.MOUSE_SGR);function Z5t(E){switch(E){case"full":return S;case"scroll":return _;case"off":return""}}
export{Dm,iL,LW,Ovt,gGe,jno,Y5t,X5t,iet,Wno,J5t,HI,DI,aet,cet,Q5t,Ise,zno,Gno,Z5t};
