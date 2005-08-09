 /* 
 * WebFormsPage.cs - Represents an ASP.NET Page in the designer
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
using System.ComponentModel;
using System.Globalization;
using System.Text;
using System.Web;
using System.IO;
using System.Web.Compilation;
using System.Collections;
using System.Web.UI;
using System.Web.UI.Design;
using System.ComponentModel.Design;

namespace AspNetEdit.Editor.ComponentModel
{
	internal class WebFormPage : System.Web.UI.Page
	{
		private const string newDocument = "<html>\n<head>\n\t<title>{0}</title>\n</head>\n<body>\n<form runat=\"server\"\n<cursor/>\n</form></body>\n</html>";
		private const string cursor = "<cursor/>";
		private const string controlSubstitute = "<aspcontrol name=\"{0}\" />";

		private StringBuilder document;
		private Hashtable directives;

		//loads an existing page from a file stream
		public WebFormPage (Stream fileStream, string fileName)
			: base ()
		{
			//this is where the parsed, substituted document goes
			document = new StringBuilder ();
			directives = new Hashtable ();
		}

		//new blank document
		public WebFormPage (string documentName)
		{
			document = new StringBuilder (String.Format (newDocument, documentName));
		}

		#region Parser
		/*
		  
			//initialise our parser and hook up events
			//StreamReader reader = new StreamReader(fileStream);
			//AspParser parser = new System.Web.Compilation.AspParser(fileName, reader);
			//reader.Close();
			
			//parser.Error += new ParseErrorHandler(parser_Error);
			//parser.TagParsed += new TagParsedHandler(parser_TagParsed);
			//parser.TextParsed += new TextParsedHandler(parser_TextParsed);

			//and go!
			//parser.Parse();
		 * 
		#region Parser event handlers

		void parser_TextParsed(ILocation location, string text)
		{
			//This one's simple. Nothing to initialise or worry about
			document.Append(text);
		}

		void parser_TagParsed(ILocation location, TagType tagtype, string id, TagAttributes attributes)
		{
			switch (tagtype)
			{
				case TagType.Directive:
					AddDirective(id, attributes);					
					break;
				case TagType.Close:
					break;
				case TagType.CodeRender:
					break;
				case TagType.CodeRenderExpression:
					break;
				case TagType.DataBinding:
					break;
				case TagType.Include:
					break;
				case TagType.SelfClosing:
					break;
				case TagType.ServerComment:
					break;
				case TagType.Tag:
					break;
				case TagType.Text:
					break;
			}
		}

		private void parser_Error(ILocation location, string message)
		{
			document = new StringBuilder();
			document.Append(ErrorDocument("Error loading document", message + "on line " + location.BeginLine));
			throw new Exception("The method or operation is not implemented.");
		}

		#endregion

		#region Parser eventhandler support

		private void AddDirective(string id, TagAttributes attributes)
		{
			document.Append("<directive no=''>");
			//directives.Add(directiveIndex);
		}

		private string ErrorDocument(string errorTitle, string errorDetails)
		{
			return "<html><body fgcolor='red'><h1>"
				+ errorTitle
				+ "</h1><p>"
				+ errorDetails
				+ "</p></body></html>";
		}

		#endregion
		*/
		#endregion

		#region Document handling

		public string ViewDocument ()
		{
			//TODO: Parse document instead of StringBuilder.Replace
			StringBuilder builder = new StringBuilder (document.ToString ());

			//get a host to work with
			if (Site == null)
				throw new Exception ("The WebFormsPage cannot be persisted without a site");
			IDesignerHost host = Site.GetService (typeof(IDesignerHost)) as IDesignerHost;
			if (host == null)
				throw new Exception ("The WebFormsPage cannot be persisted without a host");
			
			
			//substitute all components
			foreach (IComponent comp in host.Container.Components)
			{
				if (!(comp is Control) || comp.Site == null)
					throw new Exception ("The component is not a sited System.Web.UI.Control");

				System.IO.StringWriter strWriter = new System.IO.StringWriter ();
				System.Web.UI.HtmlTextWriter writer = new System.Web.UI.HtmlTextWriter (strWriter);

				string substituteText = String.Format (controlSubstitute, comp.Site.Name);
				((Control) comp).RenderControl (writer);
				writer.Flush ();
				strWriter.Flush ();
				builder.Replace(substituteText, strWriter.ToString ());
			}

			//remove cursor
			builder.Replace (cursor, string.Empty);

			return builder.ToString ();
		}

		public string PersistDocument()
		{
			//TODO: Parse document instead of StringBuilder.Replace
			StringBuilder builder = new StringBuilder (document.ToString ());

			//get a host to work with
			if (Site == null)
				throw new Exception ("The WebFormsPage cannot be persisted without a site");
			IDesignerHost host = Site.GetService (typeof (IDesignerHost)) as IDesignerHost;
			if (host == null)
				throw new Exception ("The WebFormsPage cannot be persisted without a host");

			//substitute all components
			foreach (IComponent comp in host.Container.Components)
			{
				if (!(comp is Control) || comp.Site == null)
					throw new Exception ("The component is not a sited System.Web.UI.Control");

				((Control) comp).ID = comp.Site.Name;

				string substituteText = String.Format (controlSubstitute, comp.Site.Name);
				string persistedControl = ControlPersister.PersistControl ((Control) comp, host);
				builder.Replace (substituteText, persistedControl);
			}

			//remove cursor
			builder.Replace (cursor, string.Empty);

			return builder.ToString ();
		}

		public void AddControlAtCursor (Control control)
		{
			string subst = String.Format (controlSubstitute, control.Site.Name);
			document.Replace (cursor, subst+cursor);
		}

		public void RemoveControl (Control control)
		{
			string subst = String.Format (controlSubstitute, control.Site.Name);
			document.Replace (subst, string.Empty);
		}

		internal void RenameControl (string oldName, string newName)
		{
			string oldSubstituteText = String.Format (controlSubstitute, oldName);
			string newSubstituteText = String.Format (controlSubstitute, newName);

			document.Replace (oldSubstituteText, newSubstituteText);
		}

		#endregion
	}
}
