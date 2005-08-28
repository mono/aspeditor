ASSEMBLY_NAME = propertygrid
ASSEMBLY = $(top_builddir)/build/lib/$(ASSEMBLY_NAME).dll
TARGET = $(ASSEMBLY)
resdir = $(top_builddir)/resources

propertygriddir=$(pkglibdir)
propertygrid_SCRIPTS = $(ASSEMBLY)
propertygrid_DATA = $(ASSEMBLY).mdb

PROPERTYGRID_REFERENCES =						\
	$(GTKSHARP_LIBS)						\
	-r:System.Web							\
	-r:System.Design						\
	-r:System.Drawing						\
	-r:System.Windows.Forms

PROPERTYGRID_CSFILES =							\
	$(srcdir)/AssemblyInfo.cs					\
	$(srcdir)/AspNetEdit.UI/EditorManager.cs			\
	$(srcdir)/AspNetEdit.UI/GridRow.cs				\
	$(srcdir)/AspNetEdit.UI/PropertyEditorTypeAttribute.cs		\
	$(srcdir)/AspNetEdit.UI/PropertyGrid.cs				\
	$(srcdir)/AspNetEdit.UI/PropertyValueChangedEventArgs.cs	\
	$(srcdir)/AspNetEdit.UI/PropertyValueChangedEventHandler.cs	\
	$(srcdir)/AspNetEdit.UI/SurrogateUITypeEditorAttribute.cs	\
	$(srcdir)/AspNetEdit.UI/DefaultPropertyTab.cs			\
	$(srcdir)/AspNetEdit.UI/EventPropertyTab.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/StringEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/ExpandableObjectEditor.cs	\
	$(srcdir)/AspNetEdit.UI.Editors/NumberEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/EnumEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/DefaultEditor.cs		\
	$(srcdir)/AspNetEdit.UI.Editors/ColorEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/CollectionEditor.cs		\
	$(srcdir)/AspNetEdit.UI.Editors/BoolEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/BaseEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/EventEditor.cs

RESOURCE_FILES = \
	$(resdir)/icons/AspNetEdit.UI.EventPropertyTab.bmp \
	$(resdir)/icons/AspNetEdit.UI.DefaultPropertyTab.bmp \
	$(resdir)/icons/AspNetEdit.UI.PropertyGrid.SortByCat.png

EXTRA_DIST = $(PROPERTYGRID_CSFILES)
CLEANFILES = $(ASSEMBLY) $(ASSEMBLY).mdb

$(ASSEMBLY): $(PROPERTYGRID_CSFILES)
	$(MCS) $(MCS_OPTIONS) $(PROPERTYGRID_REFERENCES) $(RESOURCE_FILES:%=/resource:%) -debug -target:library -out:$@ $(PROPERTYGRID_CSFILES)

$(ASSEMBLY).mdb: $(ASSEMBLY) 
	
all: $(ASSEMBLY)

