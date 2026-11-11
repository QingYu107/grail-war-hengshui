# -*- coding: utf-8 -*-
import io
s=io.open("js/data/timeline_e2e9.js",encoding="utf-8").read().split("\n")
for i in range(17,26): print(i+1, s[i])
print("...")
for i in range(583,600): print(i+1, s[i])
print("=== e3e8 boundary ===")
t=io.open("js/data/timeline_e3e8.js",encoding="utf-8").read().split("\n")
for i in range(14,24): print(i+1, t[i])
for i,l in enumerate(t):
    if "E8 · 凌晨四点" in l:
        for j in range(i-4,i+3): print(j+1,t[j])
        break
