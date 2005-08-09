jscallgluedir=$(pkglibdir)
dllfile = $(top_builddir)/build/lib/jscallglue.dll
jscallglue_SCRIPTS = $(dllfile)

CXXFLAGS = -shared -g -fPIC -fno-rtti $(JSGLUEDEPS_CFLAGS)

LDFLAGS = $(JSGLUEDEPS_CFLAGS)

all: $(dllfile)

$(dllfile): jscallglue.cpp
	$(CXX) $(CXXFLAGS) -o $@ $^ $(LDFLAGS)

CLEANFILES = $(dllfile)

EXTRA_DIST = README
