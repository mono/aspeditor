ASSEMBLY_NAME = aspnetedit
ASSEMBLY = $(top_builddir)/build/lib/$(ASSEMBLY_NAME).exe
TARGET = $(ASSEMBLY)

aspneteditdir=$(pkglibdir)
aspnetedit_SCRIPTS = $(ASSEMBLY)
aspnetedit_DATA = $(ASSEMBLY).mdb

ASPNETEDIT_REFERENCES =						\
	$(GTKSHARP_LIBS)					\
	$(GECKOSHARP_LIBS)					\
	-r:$(top_builddir)/build/lib/jscall.dll			\
	-r:$(top_builddir)/build/lib/propertygrid.dll		\
	-r:$(top_builddir)/build/lib/editor.dll			\
	-r:System.Web						\
	-r:System.Design					\
	-r:System.Drawing

ASPNETEDIT_CSFILES =						\
	$(srcdir)/SampleHost.cs					\
	$(srcdir)/AssemblyInfo.cs

$(ASSEMBLY): $(ASPNETEDIT_CSFILES)
	$(MCS) $(MCS_OPTIONS) $(ASPNETEDIT_REFERENCES) -debug -target:exe -out:$@ $(ASPNETEDIT_CSFILES)

$(ASSEMBLY).mdb: $(ASSEMBLY)
	
all: $(ASSEMBLY)

EXTRA_DIST = $(ASPNETEDIT_CSFILES)
CLEANFILES = $(ASSEMBLY) $(ASSEMBLY).mdb
