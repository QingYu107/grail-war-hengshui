# -*- coding: utf-8 -*-
import io,re
s=io.open("js/data/timeline_e2e9.js",encoding="utf-8").read().split("\n")
print("total lines",len(s))
for i in range(706,716): print(i+1, s[i].strip()[:60])
# find where E9 starts
for i,l in enumerate(s):
    if "E9 · 满分" in l: print("E9 header at",i+1); break
