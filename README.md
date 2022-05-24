# cs244b_fp

## Hotstuff

To run, do

```
./autogen.sh
./configure
make -j
./test

```

Make sure to create this ```/usr/local/Cellar/lmdb/0.9.29/lib/pkgconfig/lmdb.pc``` file and add 
```
prefix=/usr/local/Cellar/lmdb/0.9.29
exec_prefix=${prefix}
libdir=${prefix}/lib
includedir=${prefix}/include

Name: lmdb
Version: 0.9.29
Description: Sketchy PC file I handrolled

Libs: -L${libdir} -llmdb
Cflags: -I${includedir}
```

And then symlink with ```ln -s /usr/local/Cellar/lmdb/0.9.29/lib/pkgconfig/lmdb.pc /usr/local/lib/pkgconfig/lmdb.pc```
