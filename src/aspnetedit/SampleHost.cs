 /* 
 * SampleHost.cs - A host for the AspNetEdit AASP.NET Graphical Designer
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

		static void Main ()
		{
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

			Frame geckoFrame = new Frame ();
			geckoFrame.Shadow = ShadowType.In;
			rightBox.Pack1 (geckoFrame, true, false);

			#endregion			

			#region Toolbar

			Toolbar buttons = new Toolbar ();
			outerBox.PackStart (buttons, false, false, 0);

			ToolButton saveButton = new ToolButton (Stock.Save);
			buttons.Add (saveButton);
			saveButton.Clicked += new EventHandler (saveButton_Clicked);

			ToolButton openButton = new ToolButton(Stock.Open);
			buttons.Add(openButton);
			openButton.Clicked += new EventHandler(openButton_Clicked);

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

			#endregion

			#region Designer services and host

			//set up the services
			ServiceContainer services = new ServiceContainer ();
			services.AddService (typeof (INameCreationService), new AspNetEdit.Editor.ComponentModel.NameCreationService ());
			services.AddService (typeof (ISelectionService), new AspNetEdit.Editor.ComponentModel.SelectionService ());
			services.AddService (typeof (IEventBindingService), new AspNetEdit.Editor.ComponentModel.EventBindingService (window));
			services.AddService (typeof (ITypeResolutionService), new AspNetEdit.Editor.ComponentModel.TypeResolutionService ());
			ExtenderListService extListServ = new AspNetEdit.Editor.ComponentModel.ExtenderListService ();
			services.AddService (typeof (IExtenderListService), extListServ);
			services.AddService (typeof (IExtenderProviderService), extListServ);
			services.AddService (typeof (ITypeDescriptorFilterService), new TypeDescriptorFilterService ());
			AspNetEdit.Editor.ComponentModel.ToolboxService toolboxService = new AspNetEdit.Editor.ComponentModel.ToolboxService ();
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
			fcd.SetFilename (((System.Web.UI.Control)host.RootComponent).ID + ".aspx");

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
			throw new NotImplementedException ();
		}

		static void undoButton_Clicked (object sender, EventArgs e)
		{
			throw new NotImplementedException ();
		}
		
		static void cutButton_Clicked (object sender, EventArgs e)
		{
			throw new NotImplementedException ();
		}
		
		static void copyButton_Clicked (object sender, EventArgs e)
		{
			throw new NotImplementedException ();
		}
		
		static void pasteButton_Clicked (object sender, EventArgs e)
		{
			throw new NotImplementedException ();
		}

		#endregion

		static void window_DeleteEvent (object o, DeleteEventArgs args)
		{
			Application.Quit ();
		}


	}       
}
