/* 
* Document.cs - Represents the DesignerHost's document
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
using System.Text;
using System.Web.UI;
using System.IO;
using System.ComponentModel.Design;
using System.Collections;
using AspNetEdit.Editor.Persistence;
using System.ComponentModel;
using AspNetEdit.Editor.ComponentModel;
using System.Globalization;

namespace AspNetEdit.Editor.ComponentModel
{
	public class Document
	{
		public readonly string newDocument = "<html>\n<head>\n\t<title>{0}</title>\n</head>\n<body>\n<form runat=\"server\">\n<cursor/>\n</form></body>\n</html>";
		public readonly string cursor = "<cursor/>";
		public readonly string ControlSubstituteStructure = "<aspcontrol name=\"{0}\" />";
		public readonly string DirectivePlaceholderStructure = "<directiveplaceholder id =\"{0}\" />";

		StringBuilder document;
		Hashtable directives;
		private int directivePlaceholderKey = 0;

		private Control parent;
		private DesignerHost host;

		public Document (Control parent, DesignerHost host)
		{
			if (!(parent is WebFormPage))
				throw new NotImplementedException ("Only WebFormsPages can have a document for now");
			this.parent =  parent;
			this.host = host;

			CaseInsensitiveHashCodeProvider provider = new CaseInsensitiveHashCodeProvider(CultureInfo.InvariantCulture);
			CaseInsensitiveComparer comparer = new CaseInsensitiveComparer(CultureInfo.InvariantCulture);
			directives = new Hashtable (provider, comparer);

			document = new StringBuilder ("The document has not been loaded");
		}

		#region viewing

		public string ViewDocument()
		{
			//TODO: Parse document instead of StringBuilder.Replace
			StringBuilder builder = new StringBuilder (document.ToString());

			//substitute all components
			foreach (IComponent comp in host.Container.Components)
			{
				if (!(comp is Control) || comp.Site == null)
					throw new Exception("The component is not a sited System.Web.UI.Control");

				System.IO.StringWriter strWriter = new System.IO.StringWriter();
				System.Web.UI.HtmlTextWriter writer = new System.Web.UI.HtmlTextWriter(strWriter);

				string substituteText = String.Format(ControlSubstituteStructure, comp.Site.Name);
				((Control)comp).RenderControl(writer);
				writer.Flush();
				strWriter.Flush();
				builder.Replace(substituteText, strWriter.ToString());
			}

			//remove cursor
			builder.Replace(cursor, string.Empty);

			return builder.ToString();
		}

		#endregion

		#region save/load

		private void CheckHostIsLoading()
		{
			if (!host.Loading)
				throw new InvalidOperationException ("The document cannot be initialised or loaded unless the host is loading"); 
		}

		public void New (string documentName)
		{
			CheckHostIsLoading ();
			document = new StringBuilder (String.Format (newDocument, documentName));
		}

		public void LoadFile (Stream fileStream, string fileName)
		{
			CheckHostIsLoading ();

			DesignTimeParser ps = new DesignTimeParser (host);

			TextReader reader = new StreamReader (fileStream);
			try
			{
				string doc;
				Control[] controls;
				ps.ParseDocument (reader.ReadToEnd (), out controls, out doc);
				document = new StringBuilder (doc);
				foreach (Control c in controls)
					host.Container.Add (c);
			}
			catch (ParseException ex)
			{
				document = new StringBuilder ();
				document.AppendFormat ("<html><body><h1>{0}</h1><p>{1}</p></body>", ex.Title, ex.Message);
			}
		}

		public string PersistDocument ()
		{
			//TODO: Parse document instead of StringBuilder.Replace
			string stringDocument = document.ToString();
			StringBuilder builder = new StringBuilder (stringDocument);

			if (host == null)
				throw new Exception("The WebFormsPage cannot be persisted without a host");

			//substitute all components
			foreach (IComponent comp in host.Container.Components)
			{
				if (comp is Page)
					continue;
				if (!(comp is Control) || comp.Site == null)
					throw new Exception("The component is not a sited System.Web.UI.Control");

				((Control)comp).ID = comp.Site.Name;

				string substituteText = String.Format(ControlSubstituteStructure, comp.Site.Name);
				string persistedText = ControlPersister.PersistControl((Control)comp, host);
				builder.Replace(substituteText, persistedText);
			}

			//substitute all directive placeholders
			for (int i = 0; i <= directivePlaceholderKey; i++)
			{
				string persistedText = RemoveDirective(i);
				
				string substituteText = String.Format (DirectivePlaceholderStructure, i.ToString());
				if (stringDocument.IndexOf(substituteText) > -1)
					builder.Replace (substituteText, persistedText);
				else
					builder.Insert (0, persistedText);
			}

			//remove cursor
			builder.Replace(cursor, string.Empty);

			return builder.ToString();
		}

		#endregion

		#region add/remove controls

		public void AddControl(Control control)
		{
			string subst = String.Format(ControlSubstituteStructure, control.Site.Name);
			document.Replace(cursor, subst + cursor);
		}

		public void RemoveControl(Control control)
		{
			string subst = String.Format(ControlSubstituteStructure, control.Site.Name);
			document.Replace(subst, string.Empty);
		}

		internal void RenameControl(string oldName, string newName)
		{
			string oldSubstituteText = String.Format(ControlSubstituteStructure, oldName);
			string newSubstituteText = String.Format(ControlSubstituteStructure, newName);

			document.Replace(oldSubstituteText, newSubstituteText);
		}

		#endregion

		private string ErrorDocument(string errorTitle, string errorDetails)
		{
			return "<html><body fgcolor='red'><h1>"
				+ errorTitle
				+ "</h1><p>"
				+ errorDetails
				+ "</p></body></html>";
		}

		#region Add/fetch general directives

		/// <summary>
		/// Adds a directive port tracking.
		/// </summary>
		/// <returns>A placeholder identifier that can be used in the document</returns>
		public string AddDirective (string name, IDictionary values)
		{
			if ((0 == String.Compare (name, "Page", true, CultureInfo.InvariantCulture) && directives["Page"] != null)
				|| (0 == String.Compare (name, "Control", true, CultureInfo.InvariantCulture) && directives["Control"] != null))
				throw new Exception ("Only one Page or Control directive is allowed in a document");

			DocumentDirective directive = new DocumentDirective (name, values, directivePlaceholderKey);
			directivePlaceholderKey++;

			if (directives[name] == null)
				directives[name] = new ArrayList ();

			((ArrayList)directives[name]).Add(directive);

			return String.Format(DirectivePlaceholderStructure, directive.Key.ToString ());
		}

		public string RemoveDirective (int placeholderId)
		{
			DocumentDirective directive = null;
			foreach (DictionaryEntry de in directives)
			{
				if (de.Value is DocumentDirective) {
					if (((DocumentDirective)de.Value).Key == placeholderId) {
						directive = (DocumentDirective)de.Value;
						directives.Remove(de.Key);
					}
				}
				else
					foreach (DocumentDirective d in (ArrayList)de.Value)
						if (d.Key == placeholderId) {
							directive = d;
							((ArrayList)de.Value).Remove (d);
							break;
						}
				if (directive != null)
					break;
			}

			if (directive == null)
				return string.Empty;
			return directive.ToString();
		}

		/// <summary>
		/// Gets all of the directives of a given type
		/// </summary>
		public DocumentDirective[] GetDirectives (string directiveType)
		{
			ArrayList localDirectiveList = new ArrayList ();
			foreach (DictionaryEntry de in directives)
			{
				if (de.Value is DocumentDirective)
				{
					if (0 == string.Compare (((DocumentDirective)de.Value).Name, directiveType, true, CultureInfo.InvariantCulture))
						localDirectiveList.Add (de.Value);
				}
				else
					foreach (DocumentDirective d in (ArrayList)de.Value)
						if (0 == string.Compare (directiveType, d.Name, true, CultureInfo.InvariantCulture))
							localDirectiveList.Add (d);
			}

			return (DocumentDirective[]) localDirectiveList.ToArray (typeof (DocumentDirective));
		}

		/// <summary>
		/// Gets the first directive of a given type
		/// </summary>
		/// <param name="create">Whether the directive should be created if one does not already exist</param>
		public DocumentDirective GetFirstDirective (string directiveType, bool create)
		{
			foreach (DictionaryEntry de in directives)
			{
				if (de.Value is DocumentDirective)
				{
					if (0 == string.Compare (((DocumentDirective)de.Value).Name, directiveType, true, CultureInfo.InvariantCulture))
						return (DocumentDirective) de.Value ;
				}
				else
					foreach (DocumentDirective d in (ArrayList)de.Value)
						if (0 == string.Compare (d.Name, directiveType, true, CultureInfo.InvariantCulture))
							return d;
			}

			//should directive be created if it can't be found?
			if (create) {
				AddDirective (directiveType, null);
				return GetFirstDirective (directiveType, false);
			}

			return null;
		}


		#endregion
	}
}
