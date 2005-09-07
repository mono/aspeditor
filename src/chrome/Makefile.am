packagename = aspdesigner
chromedir = $(MOZILLA_HOME)/chrome/$(packagename)
chrome_install_file = /var/lib/mozilla/chrome/installed-chrome.txt
chrome_install_text =	"content,install,url,resource:/chrome/aspdesigner/content/aspdesigner/"		\
			"skin,install,url,resource:/chrome/aspdesigner/skin/aspdesigner/"		\
			"locale,install,url,resource:/chrome/aspdesigner/locale/en-US/aspdesigner/"

contentdir = $(chromedir)/content/$(packagename)
content_DATA = $(content_files)
content_files =	\
		$(srcdir)/content/aspdesigner.js	\
		$(srcdir)/../jscall/Resources/JSCall.js	\
		$(srcdir)/content/aspdesigner.xul	\
		$(srcdir)/content/editorContent.css	\
		$(srcdir)/content/contents.rdf


localedir = $(chromedir)/locale/en-US/$(packagename)
locale_DATA = $(locale_files)
locale_files =	\
		$(srcdir)/locale/contents.rdf


skindir = $(chromedir)/skin/$(packagename)
skin_DATA = $(skin_files)
skin_files =	\
		$(srcdir)/skin/contents.rdf	\
		$(srcdir)/skin/aspdesigner.css


install-data-hook:
	if test -f $(chrome_install_file); then f=$(chrome_install_file); else f=/opt/mozilla/lib/chrome/installed-chrome.txt; fi; \
	cp $$f /tmp/chrome.old; \
	sudo bash -c "sed -e'/aspdesigner/d' /tmp/chrome.old > $$f"; \
	for CHRM in $(chrome_install_text); do \
		cp $$f /tmp/chrome.old; \
		sudo bash -c "sed -e'\$$a$$CHRM' /tmp/chrome.old > $$f"; \
		rm /tmp/chrome.old; \
	done;

uninstall-hook:
	cp $(chrome_install_file) /tmp/chrome.old; \
	sudo bash -c "sed -e'/aspdesigner/d' /tmp/chrome.old > $(chrome_install_file)"; \
	rm /tmp/chrome.old;

EXTRA_DIST = $(content_files) $(locale_files) $(skin_files)
