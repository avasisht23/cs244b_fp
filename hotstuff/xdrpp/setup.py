import sys

files = []
for arg in sys.argv:
	if "--pyx_files=" in arg:
		arguments = arg[12:]
		files = arguments.split(" ")
		sys.argv.remove(arg)

source_files = []

from setuptools import setup
from Cython.Build import cythonize

modules = cythonize(files + source_files)

for e in modules:
    e.extra_compile_args=["-std=gnu++17"]


setup(ext_modules = modules,
	 include_dirs=[".", "../xdrpp"],
	 zip_safe = False)

