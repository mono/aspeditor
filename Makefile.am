SUBDIRS = src
bin_SCRIPTS = aspnetedit
EXTRA_DIST = script.in

REWRITE = \
        sed -e "s|\@prefix\@|$(prefix)|g"               \
            -e "s|\@pkglibdir\@|$(pkglibdir)|g"         \
            -e "s|\@bindir\@|$(bindir)|g"		\
            -e "s|\@MOZILLA_HOME\@|$(MOZILLA_HOME)|g"		\
	    -e "s|\@MONO\@|$(MONO)|g" 

$(bin_SCRIPTS): $(srcdir)/script.in Makefile
	$(REWRITE) $(srcdir)/script.in > $@.tmp
	mv $@.tmp $@

run: runasp

runasp: $(PROGRAM)
	cd $(top_builddir)/build/lib/ && LD_LIBRARY_PATH=`echo "$(LD_LIBRARY_PATH):$(MOZILLA_HOME)" | sed 's/^://g'` $(MONO) --debug aspnetedit.exe
