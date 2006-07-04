ASSEMBLY_NAME = aspnetedit
ASSEMBLY = $(top_builddir)/build/lib/$(ASSEMBLY_NAME).exe
TARGET = $(ASSEMBLY)

aspneteditdir=$(pkglibdir)
# INSTALLED_ASSEMBLIES is unstable Mono libraries (see configure.in)
aspnetedit_SCRIPTS = $(ASSEMBLY)
aspnetedit_DATA = $(ASSEMBLY).mdb

ASPNETEDIT_REFERENCES =						\
	$(GTKSHARP_LIBS)					\
	$(GECKOSHARP_LIBS)					\
	$(JSCALL_LIBS)						\
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
	
all: $(ASSEMBLY) copy-unstable-libs
clean-hook: clean-unstable-libs
install-data-hook: install-unstable-libs
uninstall-hook: uninstall-unstable-libs

EXTRA_DIST = $(ASPNETEDIT_CSFILES)
CLEANFILES = $(ASSEMBLY) $(ASSEMBLY).mdb

# Unstable Mono libraries (see configure.in)

copy-unstable-libs: $(INSTALLED_ASSEMBLIES)
	cp $(INSTALLED_ASSEMBLIES) $(top_builddir)/build/lib/

clean-unstable-libs:
	for ASM in $(INSTALLED_ASSEMBLIES); do \
		rm -f $(top_builddir)/build/lib/`basename $$ASM`; \
	done;

install-unstable-libs:
	for ASM in $(INSTALLED_ASSEMBLIES); do \
		$(INSTALL) -c -m 0755 $$ASM $(DESTDIR)$(pkglibdir); \
	done;

uninstall-unstable-libs:
	for ASM in $(INSTALLED_ASSEMBLIES); do \
		rm -f $(DESTDIR)$(pkglibdir)/`basename $$ASM`; \
	done;
