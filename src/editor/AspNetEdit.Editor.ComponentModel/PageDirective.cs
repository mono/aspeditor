 /* 
 * PageDirective.cs - represents a page directive. Can be shown in PropertyBrowser.
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
using System.Globalization;
using System.Text;
using System.ComponentModel;
using System.Web;

namespace AspNetEdit.Editor.ComponentModel
{
	internal class PageDirective
	{
		#region Property browser attributes for @Page attributes

		private bool aspCompat = false;

		[DefaultValue(false)]
		[Category("Behaviour")]
		//TODO: Add for .NET 2.0
		//[DisplayNameAttribute("AspCompat")
		[Description ("Whether the page can be executed on a single-threaded apartment thread")]
		[Bindable(false)]
		[Browsable(true)]
		public bool AspCompat
		{
			get { return aspCompat; }
			set { aspCompat = value; }
		}

		private bool autoEventWireup = true;

		[DefaultValue(true)]
		[Category("Compilation")]
		[Description("Whether the page events are automatically wired up")]
		[Bindable(false)]
		[Browsable(true)]
		public bool AutoEventWireup
		{
			get { return autoEventWireup; }
			set { autoEventWireup = value; }
		}

		private bool buffer = true;

		[DefaultValue(true)]
		[Category("Behaviour")]
		[Description("Whether HTTP response buffering is enabled")]
		[Bindable(false)]
		[Browsable(true)]
		public new bool Buffer
		{
			get { return buffer; }
			set { buffer = value; }
		}

		private string className = "";

		[DefaultValue("")]
		[Category("Compilation")]
		[ReadOnly(true)]
		[Description("The class name for the page when it is compiled")]
		[Bindable(false)]
		[Browsable(true)]
		public string ClassName
		{
			get { return className; }
			set { className = value; }
		}

		private string clientTarget = String.Empty;

		[DefaultValue("")]
		[Category("Behaviour")]
		[Description("The user agent which controls should target when rendering")]
		[Bindable(false)]
		[Browsable(true)]
		public new string ClientTarget
		{
			get { return clientTarget; }
			set { clientTarget = value; }
		}

		private string codeBehind = "";

		[DefaultValue("")]
		[ReadOnly(true)]
		[Category("Designer")]
		[Description("The codebehind file associated with the page")]
		[Bindable(false)]
		[Browsable(true)]
		public string CodeBehind
		{
			get { return codeBehind; }
			set { codeBehind = value; }
		}

		private int codePage = 0;

		[DefaultValue(0)]
		[Category("Globalization")]
		[Description("The code page used for the response")]
		[Bindable(false)]
		[Browsable(true)]
		public new int CodePage
		{
			get { return codePage; }
			set { codePage = value; }
		}

		private string compilerOptions = "";

		[DefaultValue("")]
		[Category("Compilation")]
		[Description("Command-line options used when compiling the page")]
		[Bindable(false)]
		[Browsable(true)]
		public string CompilerOptions
		{
			get { return compilerOptions; }
			set { compilerOptions = value; }
		}

		private string contentType = "text/html";

		[DefaultValue("text/html")]
		[Category("Behaviour")]
		[Description("The MIME type of the HTTP response content")]
		[Bindable(false)]
		[Browsable(true)]
		public new string ContentType
		{
			get { return contentType; }
			set { contentType = value; }
		}

		private CultureInfo culture;

		[DefaultValue(null)]
		[Category("Globalization")]
		[Description("The culture setting for the page")]
		[Bindable(false)]
		[Browsable(true)]
		public new CultureInfo Culture
		{
			get { return culture; }
			set { culture = value; }
		}

		private bool debug = false;

		[DefaultValue(false)]
		[Category("Compilation")]
		[Description("Whether the page should be compiled with debugging symbols")]
		[Bindable(false)]
		[Browsable(true)]
		public bool Debug
		{
			get { return debug; }
			set { debug = value; }
		}

		private string description = "";

		[DefaultValue("")]
		[Category("Designer")]
		[Description("A description of the page")]
		[Bindable(false)]
		[Browsable(true)]
		public string Description
		{
			get { return description; }
			set { description = value; }
		}

		private string enableSessionState = "true";

		[DefaultValue("true")]
		[Category("Behaviour")]
		[Description("Whether SessionState is enabled (true), read-only (ReadOnly) or disabled (false)")]
		[Bindable(false)]
		[Browsable(true)]
		public string EnableSessionState
		{
			get { return enableSessionState; }
			set { enableSessionState = value; }
		}

		private bool enableViewState = true;

		[DefaultValue(true)]
		[Category("Behaviour")]
		[Description("Whether view state is enabled")]
		[Bindable(false)]
		[Browsable(true)]
		public new bool EnableViewState
		{
			get { return enableViewState; }
			set { enableViewState = value; }
		}

		private bool viewStateMac = false;

		[DefaultValue(false)]
		[Category("Behaviour")]
		[Description("Whether a machine authentication check should be run on the view state")]
		[Bindable(false)]
		[Browsable(true)]
		public bool ViewStateMac
		{
			get { return viewStateMac; }
			set { viewStateMac = value; }
		}

		private string errorPage = "";

		[DefaultValue("")]
		[Category("Behaviour")]
		[Description("The URL to redirect to in the event of an unhandled page exception")]
		[Bindable(false)]
		[Browsable(true)]
		public new string ErrorPage
		{
			get { return errorPage; }
			set { errorPage = value; }
		}

		private bool _explicit = false;

		[DefaultValue(false)]
		[Category("Compilation")]
		[Description("Whether the page should be compiled with Option Explicit for VB 2005")]
		[Bindable(false)]
		[Browsable(true)]
		public bool Explicit
		{
			get { return _explicit; }
			set { _explicit = value; }
		}

		private string inherits;

		[DefaultValue("")]
		[Category("Compilation")]
		[Description("The code-behind class from which the page inherits")]
		[Bindable(false)]
		[Browsable(true)]
		public string Inherits
		{
			get { return inherits; }
			set { inherits = value; }
		}

		private string language;

		[DefaultValue("")]
		[ReadOnly(true)]
		[Category("Compilation")]
		[Description("The language used for compiling inline rendering and block code")]
		[Bindable(false)]
		[Browsable(true)]
		public string Language
		{
			get { return language; }
			set { language = value; }
		}

		private int lcid = 0;

		[DefaultValue(0)]
		[Category("Globalization")]
		[Description("The locale identifier of the page. Defaults to the web server's locale")]
		[Bindable(false)]
		[Browsable(true)]
		public new int LCID
		{
			get { return lcid; }
			set { lcid = value; }
		}

		private Encoding responseEncoding = null;

		[DefaultValue(null)]
		[Category("Globalization")]
		[Description("The encoding of the HTTP response content")]
		[Bindable(false)]
		[Browsable(true)]
		public new Encoding ResponseEncoding
		{
			get { return responseEncoding; }
			set { responseEncoding = value; }
		}

		private string src = "";

		[DefaultValue("")]
		[ReadOnly(true)]
		[Category("Compilation")]
		[Description("The optional code-behind source file to compile when the page is requested")]
		[Bindable(false)]
		[Browsable(true)]
		public string Src
		{
			get { return src; }
			set { src = value; }
		}

		private bool smartNavigation = false;

		[DefaultValue(false)]
		[Category("Behaviour")]
		[Description("Whether to maintain scroll position and focus during refreshes. IE5.5 or later only.")]
		[Bindable(false)]
		[Browsable(true)]
		public new bool SmartNavigation
		{
			get { return smartNavigation; }
			set { smartNavigation = value; }
		}

		private bool strict = false;

		[DefaultValue(false)]
		[Category("Compilation")]
		[Description("Whether the page should be compiled with Option Strict for VB 2005")]
		[Bindable(false)]
		[Browsable(true)]
		public bool Strict
		{
			get { return strict; }
			set { strict = value; }
		}

		private bool trace = false;

		[DefaultValue(false)]
		[Category("Behaviour")]
		[Description("Whether tracing is enabled")]
		[Bindable(false)]
		[Browsable(true)]
		public new bool Trace
		{
			get { return trace; }
			set { trace = value; }
		}

		private TraceMode traceMode = TraceMode.Default;

		[DefaultValue(TraceMode.Default)]
		[Category("Behaviour")]
		[Description("The sorting mode for tracing message")]
		[Bindable(false)]
		[Browsable(true)]
		public TraceMode TraceMode
		{
			get { return traceMode; }
			set { traceMode = value; }
		}

		private string transaction = "Disabled";

		[DefaultValue("Disabled")]
		[Category("Behaviour")]
		[Description("How transactions are supported. Disabled,	NotSupported, Supported, Required, or RequiresNew")]
		[Bindable(false)]
		[Browsable(true)]
		public string Transaction
		{
			get { return transaction; }
			set { transaction = value; }
		}

		private CultureInfo uiCulture = null;

		[DefaultValue(null)]
		[Category("Globalization")]
		[Description("The UI culture to use")]
		[Bindable(false)]
		[Browsable(true)]
		public new CultureInfo UICulture
		{
			get { return uiCulture; }
			set { uiCulture = value; }
		}

		private bool validateRequest = true;

		[DefaultValue(true)]
		[Category("Behaviour")]
		[Description("Whether to use request validation to increase security")]
		[Bindable(false)]
		[Browsable(true)]
		public bool ValidateRequest
		{
			get { return validateRequest; }
			set { validateRequest = value; }
		}

		private int warningLevel = 4;

		[DefaultValue(4)]
		[Category("Compilation")]
		[Description("The compiler warning level at which to abort compilation")]
		[Bindable(false)]
		[Browsable(true)]
		public int WarningLevel
		{
			get { return warningLevel; }
			set { warningLevel = value; }
		}

		#endregion
	}
}
