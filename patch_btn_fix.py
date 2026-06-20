#!/usr/bin/env python3
path = "/Users/azamahmad/Claude/Projects/Vanguardeer/shared.css"
with open(path, "r") as f:
    css = f.read()

old = '''.article-content a{color:var(--amber);text-decoration:underline;text-underline-offset:3px}
.article-content a:hover{color:var(--amber2)}'''

new = '''.article-content a{color:var(--amber);text-decoration:underline;text-underline-offset:3px}
.article-content a:hover{color:var(--amber2)}
.article-content .btn,.article-content .btn:hover{text-decoration:none}
.article-content .btn-amber,.article-content .btn-amber:hover{color:#0B1F3A}
.article-content .btn-navy,.article-content .btn-navy:hover{color:#FFFFFF}'''

if old in css:
    css = css.replace(old, new, 1)
    print("✓  shared.css button colour fix applied")
else:
    print("✗  Not matched")

with open(path, "w") as f:
    f.write(css)
