ASSEMBLY_NAME = editor
ASSEMBLY = $(top_builddir)/build/lib/$(ASSEMBLY_NAME).dll
TARGET = $(ASSEMBLY)

editordir=$(pkglibdir)
editor_SCRIPTS = $(ASSEMBLY)
editor_DATA = $(ASSEMBLY).mdb

EDITOR_REFERENCES =						\
	$(GTKSHARP_LIBS)					\
	$(GECKOSHARP_LIBS)					\
	-r:$(top_builddir)/build/lib/jscall.dll			\
	-r:$(top_builddir)/build/lib/propertygrid.dll		\
	-r:System.Web						\
	-r:System.Design					\
	-r:System.Drawing					\
	-r:System.Windows.Forms					\
	-r:System.Data

EDITOR_CSFILES =									\
	$(srcdir)/AssemblyInfo.cs							\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/DesignContainer.cs			\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/SelectionService.cs			\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/DesignerHost.cs			\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/ToolboxService.cs			\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/EventBindingService.cs		\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/Transaction.cs			\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/ExtenderListService.cs		\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/TypeDescriptorFilterService.cs	\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/MenuCommandService.cs		\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/TypeResolutionService.cs		\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/WebFormPage.cs			\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/WebFormReferenceManager.cs		\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/RootDesigner.cs			\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/NameCreationService.cs		\
	$(srcdir)/AspNetEdit.Editor.UI/PropertyGrid.cs					\
	$(srcdir)/AspNetEdit.Editor.UI/RootDesignerView.cs				\
	$(srcdir)/AspNetEdit.Editor.UI/Toolbox.cs					\
	$(srcdir)/AspNetEdit.Editor.UI/ToolboxItemBox.cs				\
	$(srcdir)/AspNetEdit.Editor.Persistence/AspParser.cs				\
	$(srcdir)/AspNetEdit.Editor.Persistence/AspTokenizer.cs				\
	$(srcdir)/AspNetEdit.Editor.Persistence/ControlPersister.cs			\
	$(srcdir)/AspNetEdit.Editor.Persistence/Directive.cs				\
	$(srcdir)/AspNetEdit.Editor.Persistence/ILocation.cs				\
	$(srcdir)/AspNetEdit.Editor.Persistence/Location.cs				\
	$(srcdir)/AspNetEdit.Editor.Persistence/ParseException.cs			\
	$(srcdir)/AspNetEdit.Editor.Persistence/ParsingObject.cs			\
	$(srcdir)/AspNetEdit.Editor.Persistence/DesignTimeParser.cs			\
	$(srcdir)/AspNetEdit.Editor.Persistence/HtmlParsingObject.cs			\
	$(srcdir)/AspNetEdit.Editor.Persistence/RootParsingObject.cs			\
	$(srcdir)/AspNetEdit.Editor.Persistence/ServerControlParsingObject.cs		\
	$(srcdir)/AspNetEdit.Editor.Persistence/StrUtils.cs				\
	$(srcdir)/AspNetEdit.Editor.Persistence/TagAttributes.cs			\
	$(srcdir)/AspNetEdit.Editor.Persistence/TagType.cs				\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/Document.cs				\
	$(srcdir)/AspNetEdit.Editor.ComponentModel/DocumentDirective.cs

$(ASSEMBLY): $(EDITOR_CSFILES)
	$(MCS) $(MCS_OPTIONS) $(EDITOR_REFERENCES) -debug -target:library -out:$@ $(EDITOR_CSFILES)
	
$(ASSEMBLY).mdb: $(ASSEMBLY)

all: $(ASSEMBLY) $(ASSEMBLY).mdb

EXTRA_DIST = $(EDITOR_CSFILES)
CLEANFILES = $(ASSEMBLY) $(ASSEMBLY).mdb
