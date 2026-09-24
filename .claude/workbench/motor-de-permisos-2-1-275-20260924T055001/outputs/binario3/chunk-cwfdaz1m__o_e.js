function o_e(e,n){return new RegExp(`^${e.split("*").map((r)=>r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join(".*")}$`,"s").test(n)}
