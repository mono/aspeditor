SUBDIRS = jscallglue

ASSEMBLY_NAME = jscall
ASSEMBLY = $(top_builddir)/build/lib/$(ASSEMBLY_NAME).dll
TARGET = $(ASSEMBLY)

jscalldir=$(pkglibdir)
jscall_SCRIPTS = $(ASSEMBLY)
jscall_DATA = $(ASSEMBLY).mdb

JSCALL_CSFILES =							\
	$(srcdir)/AssemblyInfo.cs					\
	$(srcdir)/AspNetEdit.JSCall/CommandManager.cs			\
	$(srcdir)/AspNetEdit.JSCall/InvalidJSArgumentException.cs

JSCALL_REFERENCES = 		\
	$(GTKSHARP_LIBS)	\
	$(GECKOSHARP_LIBS)


$(ASSEMBLY): $(JSCALL_CSFILES)
	$(MCS) $(MCS_OPTIONS) $(JSCALL_REFERENCES) -debug -target:library -out:$@ $(JSCALL_CSFILES)

$(ASSEMBLY).mdb: $(ASSEMBLY)

all: $(ASSEMBLY)

EXTRA_DIST = $(JSCALL_CSFILES) $(srcdir)/README $(srcdir)/Resources/JSCall.js 
CLEANFILES = $(ASSEMBLY) $(ASSEMBLY).mdb
