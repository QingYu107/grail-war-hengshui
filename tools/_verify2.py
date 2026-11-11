# -*- coding: utf-8 -*-
import io,re
# 1) banned words anywhere
for f in ["js/data/timeline_e2e9.js","js/data/timeline_e3e8.js"]:
    s=io.open(f,encoding="utf-8").read().split("\n")
    hits=[(i+1,l) for i,l in enumerate(s) if re.search("仿佛|宛如|似乎",l)]
    print(f,"banned hits:",[(n,x.strip()[:40]) for n,x in hits])
    # 2) latin inside text items
    bad=[]
    for i,l in enumerate(s):
        m=re.match(r"^\s+'(.+)',?$",l)
        if m and re.search(r"[A-Za-z]",m.group(1)) and "fx" not in l: bad.append((i+1,m.group(1)[:40]))
    print(f,"latin in text items:",bad)
# 3) untouched blocks
def seg(path,key):
    s=io.open(path,encoding="utf-8").read()
    a=s.index("  /* ============================================================\n     %s"%key)
    return s[a:]
print("E9 block identical:", seg("js/data/timeline_e2e9.js","E9")==seg("js/data/timeline_e2e9.js.bak","E9"))
print("E8 block identical:", seg("js/data/timeline_e3e8.js","E8")==seg("js/data/timeline_e3e8.js.bak","E8"))
print("E2 head identical:", io.open("js/data/timeline_e2e9.js",encoding="utf-8").read().split("  T.E2 = {")[0]==io.open("js/data/timeline_e2e9.js.bak",encoding="utf-8").read().split("  T.E2 = {")[0])
print("E3 head identical:", io.open("js/data/timeline_e3e8.js",encoding="utf-8").read().split("  T.E3 = {")[0]==io.open("js/data/timeline_e3e8.js.bak",encoding="utf-8").read().split("  T.E3 = {")[0])
