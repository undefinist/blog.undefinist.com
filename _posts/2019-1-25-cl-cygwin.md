---
layout: post
title: Using cl in cygwin
---

If you have a cygwin installation, it can be a bit hard to get cl to work in cygwin. The reason is because cl.exe needs all the fancy environment variables set up to work properly. Here's a configuration that I've been using for a long time.

1. Download this [shell script](/assets/extractvcvars.sh) and place it in `/home/USERNAME` (or just `~`).
I don't remember where I got the shell script from.

2. Type this at the end of `~/.bash_profile`. Of course, paths may vary. Also, note the x64 following the path. Changing it to x86 will invoke the x86 version of cl.
```shell
pwd=`pwd`
cd ~
./extractvcvars.sh "C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Community\\VC\\Auxiliary\\Build\\vcvarsall.bat" x64 &> /dev/null
. ./localdevenv.sh
cd "${pwd}"
```

3. Run cygwin, and hopefully it should work? The script will generate 2 additional files every time you run cygwin.
(Of course, you really need to run `extractvcvars.sh` once, and just use the `localdevenv.sh`. But it's easier to manage this way.)