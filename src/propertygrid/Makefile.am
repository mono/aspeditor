ASSEMBLY_NAME = propertygrid
ASSEMBLY = $(top_builddir)/build/lib/$(ASSEMBLY_NAME).dll
TARGET = $(ASSEMBLY)

propertygriddir=$(pkglibdir)
propertygrid_SCRIPTS = $(ASSEMBLY)
propertygrid_DATA = $(ASSEMBLY).mdb

PROPERTYGRID_REFERENCES =						\
	$(GTKSHARP_LIBS)						\
	-r:System.Web							\
	-r:System.Design						\
	-r:System.Drawing

PROPERTYGRID_CSFILES =							\
	$(srcdir)/AssemblyInfo.cs					\
	$(srcdir)/AspNetEdit.UI/EditorManager.cs			\
	$(srcdir)/AspNetEdit.UI/GridRow.cs				\
	$(srcdir)/AspNetEdit.UI/PropertyEditorTypeAttribute.cs		\
	$(srcdir)/AspNetEdit.UI/PropertyGrid.cs				\
	$(srcdir)/AspNetEdit.UI/PropertyValueChangedEventArgs.cs	\
	$(srcdir)/AspNetEdit.UI/PropertyValueChangedEventHandler.cs	\
	$(srcdir)/AspNetEdit.UI/SurrogateUITypeEditorAttribute.cs	\
	$(srcdir)/AspNetEdit.UI.Editors/StringEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/NumberEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/EnumEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/DefaultEditor.cs		\
	$(srcdir)/AspNetEdit.UI.Editors/ColorEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/CollectionEditor.cs		\
	$(srcdir)/AspNetEdit.UI.Editors/BoolEditor.cs			\
	$(srcdir)/AspNetEdit.UI.Editors/BaseEditor.cs

EXTRA_DIST = $(PROPERTYGRID_CSFILES)
CLEANFILES = $(ASSEMBLY) $(ASSEMBLY).mdb

$(ASSEMBLY): $(PROPERTYGRID_CSFILES)
	$(MCS) $(PROPERTYGRID_REFERENCES) -debug -target:library -out:$@ $(PROPERTYGRID_CSFILES)

$(ASSEMBLY).mdb: $(ASSEMBLY) 
	
all: $(ASSEMBLY)

