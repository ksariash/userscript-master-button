#!/usr/bin/env python3
"""Reproducible dependency-free userscript builder."""
from pathlib import Path
P=Path(__file__).resolve().parent
VERSION='0.1.2'
META=f'''// ==UserScript==
// @name         iPhone Master Button
// @namespace    https://github.com/ksariash/userscript-master-button
// @version      {VERSION}
// @description  A single floating drawer for clean links, nuisance filtering, media, and Azure narration
// @author       ksariash
// @match        *://*/*
// @exclude      *://*.banking.*/*
// @run-at       document-start
// @noframes
// @inject-into  content
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.setClipboard
// @connect      *.tts.speech.microsoft.com
// @connect      *.cognitiveservices.azure.com
// @connect      raw.githubusercontent.com
// @connect      *.twimg.com
// @connect      *.fbcdn.net
// @connect      *.cdninstagram.com
// @connect      *.licdn.com
// @connect      *.facebook.com
// @connect      *.instagram.com
// @connect      *.linkedin.com
// @connect      *.reddit.com
// @connect      *.googlevideo.com
// @updateURL    https://raw.githubusercontent.com/ksariash/userscript-master-button/main/dist/master-button.meta.js
// @downloadURL  https://raw.githubusercontent.com/ksariash/userscript-master-button/main/dist/master-button.user.js
// ==/UserScript==
'''
def build():
    src='\n'.join(p.read_text() for p in sorted((P/'src').glob('*.js')))
    result=META+'\n;(()=>{\n'+src+'\n})();\n'
    (P/'dist').mkdir(exist_ok=True)
    (P/'dist'/'master-button.user.js').write_text(result)
    (P/'dist'/'master-button.meta.js').write_text(META)
    print('Built',len(result),'bytes from',len(list((P/'src').glob('*.js'))),'modules')
if __name__=='__main__':build()
