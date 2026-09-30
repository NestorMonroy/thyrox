function on(e,n){if(e.endsWith("/**")){let r=e.slice(0,-3);return/[^/]/.test(r)?r.includes("/")||!n||/^[!#]/.test(r)?r:"/"+r:"/**"}return e}
