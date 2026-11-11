# -*- coding: utf-8 -*-
import io,re,shutil
def splice(path,key,marker_title,newfile):
    s=io.open(path,encoding="utf-8").read()
    new=io.open(newfile,encoding="utf-8").read()
    start=s.index("  T.%s = {"%key)
    end=s.index("  /* ============================================================\n     %s"%marker_title)
    old=s[start:end]
    print(key,"old len",len(old),"old fx",len(re.findall(r"\{ fx: ",old)),"old titles",old.count("title: '第"))
    print(key,"new len",len(new),"new fx",len(re.findall(r"\{ fx: ",new)),"new titles",new.count("title: '第"))
    snip=s[:start]+new
    if not snip.endswith("\n"): snip+="\n"
    snip+="\n"+s[end:]
    shutil.copyfile(path,path+".bak")
    io.open(path,"w",encoding="utf-8").write(snip)
    print(key,"written",len(snip))
splice("js/data/timeline_e2e9.js","E2","E9","tools/_e2new.txt")
splice("js/data/timeline_e3e8.js","E3","E8","tools/_e3new.txt")
