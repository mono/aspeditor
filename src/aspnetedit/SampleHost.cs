 /* 
 * SampleHost.cs - A host for the AspNetEdit ASP.NET Graphical Designer
 * 
 * Authors: 
 *  Michael Hutchinson <m.j.hutchinson@gmail.com>
 *  
 * Copyright (C) 2005 Michael Hutchinson
 *
 * This sourcecode is licenced under The MIT License:
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

using System;
using Gtk;
using GtkSharp;
using AspNetEdit.Editor;
using AspNetEdit.Editor.UI;
using AspNetEdit.Editor.ComponentModel;
using System.ComponentModel;
using System.ComponentModel.Design;
using System.Drawing.Design;
using System.ComponentModel.Design.Serialization;
using System.IO;


namespace AspNetEdit.SampleHost
{
	class SampleHost
	{
		static DesignerHost host;
		static Frame geckoFrame;
		static AspNetEdit.Editor.ComponentModel.ToolboxService toolboxService;

		static void Main ()
		{
			#if TRACE
				System.Diagnostics.TextWriterTraceListener listener
					= new System.Diagnostics.TextWriterTraceListener (System.Console.Out);
				System.Diagnostics.Trace.Listeners.Add (listener);
			#endif
			
			Application.Init ();

			#region Packing and layout

			Window window = new Window ("AspNetEdit Host Sample");
			window.SetDefaultSize (1000, 700);
			window.DeleteEvent += new DeleteEventHandler (window_DeleteEvent);

			VBox outerBox = new VBox ();
			window.Add (outerBox);

			HPaned leftBox = new HPaned ();
			outerBox.PackEnd (leftBox, true, true, 0);
			HPaned rightBox = new HPaned ();
			leftBox.Add2 (rightBox);

			geckoFrame = new Frame ();
			geckoFrame.Shadow = ShadowType.In;
			rightBox.Pack1 (geckoFrame, true, false);

			#endregion			

			#region Toolbar
			
			// * Save/Open
			
			Toolbar buttons = new Toolbar ();
			outerBox.PackStart (buttons, false, false, 0);

			ToolButton saveButton = new ToolButton (Stock.Save);
			buttons.Add (saveButton);
			saveButton.Clicked += new EventHandler (saveButton_Clicked);

			ToolButton openButton = new ToolButton(Stock.Open);
			buttons.Add(openButton);
			openButton.Clicked += new EventHandler(openButton_Clicked);
			
			buttons.Add (new SeparatorToolItem());
			
			// * Clipboard

			ToolButton undoButton = new ToolButton (Stock.Undo);
			buttons.Add (undoButton);
			undoButton.Clicked +=new EventHandler (undoButton_Clicked);

			ToolButton redoButton = new ToolButton (Stock.Redo);
			buttons.Add (redoButton);
			redoButton.Clicked += new EventHandler (redoButton_Clicked);

			ToolButton cutButton = new ToolButton (Stock.Cut);
			buttons.Add (cutButton);
			cutButton.Clicked += new EventHandler (cutButton_Clicked);

			ToolButton copyButton = new ToolButton (Stock.Copy);
			buttons.Add (copyButton);
			copyButton.Clicked += new EventHandler (copyButton_Clicked);

			ToolButton pasteButton = new ToolButton (Stock.Paste);
			buttons.Add (pasteButton);
			pasteButton.Clicked += new EventHandler (pasteButton_Clicked);
			
			buttons.Add (new SeparatorToolItem());
			
			// * Text style
			
			ToolButton boldButton = new ToolButton (Stock.Bold);
			buttons.Add (boldButton);
			boldButton.Clicked += new EventHandler (boldButton_Clicked);
			
			ToolButton italicButton = new ToolButton (Stock.Italic);
			buttons.Add (italicButton);
			italicButton.Clicked += new EventHandler (italicButton_Clicked);
			
			ToolButton underlineButton = new ToolButton (Stock.Underline);
			buttons.Add (underlineButton);
			underlineButton.Clicked += new EventHandler (underlineButton_Clicked);
			
			ToolButton indentButton = new ToolButton (Stock.Indent);
			buttons.Add (indentButton);
			indentButton.Clicked += new EventHandler (indentButton_Clicked);
			
			ToolButton unindentButton = new ToolButton (Stock.Unindent);
			buttons.Add (unindentButton);
			unindentButton.Clicked += new EventHandler (unindentButton_Clicked);
			
			buttons.Add (new SeparatorToolItem());
			
			// * Toolbox
			
			ToolButton toolboxAddButton = new ToolButton (Stock.Add);
			buttons.Add (toolboxAddButton);
			toolboxAddButton.Clicked += new EventHandler (toolboxAddButton_Clicked);

			#endregion

			#region Designer services and host

			//set up the services
			ServiceContainer services = new ServiceContainer ();
			services.AddService (typeof (INameCreationService), new NameCreationService ());
			services.AddService (typeof (ISelectionService), new SelectionService ());
			services.AddService (typeof (IEventBindingService), new EventBindingService (window));
			services.AddService (typeof (ITypeResolutionService), new TypeResolutionService ());
			ExtenderListService extListServ = new AspNetEdit.Editor.ComponentModel.ExtenderListService ();
			services.AddService (typeof (IExtenderListService), extListServ);
			services.AddService (typeof (IExtenderProviderService), extListServ);
			services.AddService (typeof (ITypeDescriptorFilterService), new TypeDescriptorFilterService ());
			toolboxService = new ToolboxService ();
			services.AddService (typeof (IToolboxService), toolboxService);
			
			//create our host
			host = new DesignerHost(services);
			host.NewFile();
			host.Activate();	

			#endregion

			#region Designer UI and panels
			
			IRootDesigner rootDesigner = (IRootDesigner) host.GetDesigner (host.RootComponent);
			RootDesignerView designerView = (RootDesignerView) rootDesigner.GetView (ViewTechnology.Passthrough);
			geckoFrame.Add (designerView);
			
			PropertyGrid p = new PropertyGrid (services);
			p.WidthRequest = 200;
			rightBox.Pack2 (p, false, false);

			Toolbox toolbox = new Toolbox (services);
			leftBox.Pack1 (toolbox, false, false);
			toolboxService.PopulateFromAssembly (System.Reflection.Assembly.GetAssembly (typeof (System.Web.UI.Control)));
			toolboxService.AddToolboxItem (new TextToolboxItem ("<table><tr><td></td><td></td></tr><tr><td></td><td></td></tr></table>", "Table"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<div style=\"width: 100px; height: 100px;\"></div>", "Div"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<hr />", "Horizontal Rule"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<select><option></option></select>", "Select"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<img src=\"\" />", "Image"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<textarea cols=\"20\" rows=\"2\"></textarea>", "Textarea"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<input type=\"hidden\" />", "Input [Hidden]"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<input type=\"radio\" />", "Input [Radio]"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<input type=\"checkbox\" />", "Input [Checkbox]"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<input type=\"password\" />", "Input [Password]"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<input type=\"file\" />", "Input [File]"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<input type=\"text\" />", "Input [Text]"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<input type=\"submit\" value=\"submit\" />", "Input [Submit]"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<input type=\"reset\" value=\"reset\" />", "Input [Reset]"), "Html");
			toolboxService.AddToolboxItem (new TextToolboxItem ("<input type=\"button\" value=\"button\" />", "Input [Button]"), "Html");
			toolbox.UpdateCategories ();
			
			#endregion
			
			window.ShowAll ();
			Application.Run ();
		}



		#region Toolbar click handlers

		static void saveButton_Clicked (object sender, EventArgs e)
		{
			FileChooserDialog fcd = new FileChooserDialog ("Save page as...", (Window)((Widget)sender).Toplevel, FileChooserAction.Save);
			fcd.AddButton (Stock.Cancel, ResponseType.Cancel);
			fcd.AddButton (Stock.Save, ResponseType.Ok);
			fcd.DefaultResponse = ResponseType.Ok;
			fcd.Filter = new FileFilter();
			fcd.Filter.AddPattern ("*.aspx");
			fcd.SelectMultiple = false;
			fcd.SetFilename (((System.Web.UI.Control)host.RootComponent).ID + ".aspx");

			ResponseType response = (ResponseType) fcd.Run();
			fcd.Hide();

			if (response == ResponseType.Ok && fcd.Filename != null)
				using (FileStream fileStream = new FileStream (fcd.Filename, FileMode.Create))
				{
					if (fileStream == null)
						return;
					host.SaveDocument (fileStream);
				}
			fcd.Destroy ();
		}

		static void openButton_Clicked(object sender, EventArgs e)
		{
			FileChooserDialog fcd = new FileChooserDialog ("Open page...", (Window)((Widget)sender).Toplevel, FileChooserAction.Open);
			fcd.AddButton(Stock.Cancel, ResponseType.Cancel);
			fcd.AddButton(Stock.Open, ResponseType.Ok);
			fcd.DefaultResponse = ResponseType.Ok;
			fcd.Filter = new FileFilter();
			fcd.Filter.AddPattern ("*.aspx");
			fcd.SelectMultiple = false;

			ResponseType response = (ResponseType) fcd.Run( );
			fcd.Hide ();

			if (response == ResponseType.Ok && fcd.Filename != null)
				using (FileStream fileStream = new FileStream (fcd.Filename, FileMode.Open))
				{
					if (fileStream == null)
						return;
					
					host.Reset ();
					
					host.Load (fileStream, fcd.Filename);
					host.Activate ();
				}
			fcd.Destroy();
		}

		static void redoButton_Clicked (object sender, EventArgs e)
		{
			host.RootDocument.DoCommand (EditorCommand.Redo);
		}

		static void undoButton_Clicked (object sender, EventArgs e)
		{
			host.RootDocument.DoCommand (EditorCommand.Undo);
		}
		
		static void cutButton_Clicked (object sender, EventArgs e)
		{
			host.RootDocument.DoCommand (EditorCommand.Cut);
		}
		
		static void copyButton_Clicked (object sender, EventArgs e)
		{
			host.RootDocument.DoCommand (EditorCommand.Copy);
		}
		
		static void pasteButton_Clicked (object sender, EventArgs e)
		{
			host.RootDocument.DoCommand (EditorCommand.Paste);
		}
		
		static void italicButton_Clicked (object sender, EventArgs e)
		{
			host.RootDocument.DoCommand (EditorCommand.Italic);
		}
		
		static void boldButton_Clicked (object sender, EventArgs e)
		{
			host.RootDocument.DoCommand (EditorCommand.Bold);
		}
		
		static void underlineButton_Clicked (object sender, EventArgs e)
		{
			host.RootDocument.DoCommand (EditorCommand.Underline);
		}
		
		static void indentButton_Clicked (object sender, EventArgs e)
		{
			host.RootDocument.DoCommand (EditorCommand.Indent);
		}
		
		static void unindentButton_Clicked (object sender, EventArgs e)
		{
			host.RootDocument.DoCommand (EditorCommand.Outdent);
		}
		
		static void toolboxAddButton_Clicked (object sender, EventArgs e)
		{
			FileChooserDialog fcd = new FileChooserDialog ("Add custom controls...", (Window)((Widget)sender).Toplevel, FileChooserAction.Open);
			fcd.AddButton(Stock.Cancel, ResponseType.Cancel);
			fcd.AddButton(Stock.Open, ResponseType.Ok);
			fcd.DefaultResponse = ResponseType.Ok;
			fcd.Filter = new FileFilter();
			fcd.Filter.AddPattern ("*.dll");
			fcd.SelectMultiple = false;

			ResponseType response = (ResponseType) fcd.Run( );
			fcd.Hide ();

			if (response == ResponseType.Ok && fcd.Filename != null)
				try{
					System.Reflection.Assembly a = System.Reflection.Assembly.LoadFrom (fcd.Filename);
					toolboxService.PopulateFromAssembly (a);
				}
				catch (Exception ex) {
					//TODO: handle this better!
					System.Diagnostics.Trace.WriteLine ("Could not load assembly \"" + fcd.Filename + "\".");
				}
			fcd.Destroy();
		}

		#endregion

		static void window_DeleteEvent (object o, DeleteEventArgs args)
		{
			Application.Quit ();
		}


	}       
}
