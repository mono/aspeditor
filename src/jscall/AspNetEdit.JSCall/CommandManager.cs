 /* 
 * CommandManager.cs - The C# side of the JSCall Gecko#/C# glue layer
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
using System.Collections;
using Gecko;
using System.Text;
using System.Runtime.InteropServices;

namespace AspNetEdit.JSCall
{
	public class CommandManager
	{
		[DllImport ("jscallglue.dll")]
		static extern int PlaceFunctionCall (IntPtr embed,
			[MarshalAs(UnmanagedType.LPWStr)] string call,
			[MarshalAs(UnmanagedType.LPWStr)] string returnto,
			[MarshalAs(UnmanagedType.LPWStr)] string args);
		
		private Hashtable functions;
		private WebControl webControl;

		public CommandManager (WebControl w)
		{
			functions = new Hashtable();		

			webControl = w;
			webControl.TitleChange += new EventHandler (webControl_ECMAStatus);	
		}
		
		private void webControl_ECMAStatus (object sender, EventArgs e)
		{
			if (!webControl.Title.StartsWith ("JSCall"))
				return;
			
			string[] call = webControl.Title.Split ('|');
			if (call.Length < 2)
				throw new Exception ("Too few parameters in call from JavaScript");
				
			string function = call[1];
			string returnTo = call[2];

			string[] args = (string[]) System.Array.CreateInstance (typeof(String), (call.Length - 3));
			System.Array.Copy (call, 3, args, 0, (call.Length - 3));
			
			if (!functions.Contains (function))
				throw new Exception ("Unknown function name called from JavaScript");
			
			ClrCall clrCall = (ClrCall) functions[function];
			

			if (returnTo.Length == 0)
			{
				string result = clrCall (args);
			}
			else
			{
				string[] result = { clrCall (args) };
				JSCall(returnTo, null, result);
			}
		}
		
		

		public void JSCall (string function, string returnTo, params string[] args)
		{
			string argsOut = String.Empty;

			if (args != null)
			{
				argsOut +=  args[0];
				for (int i = 1; i <= args.Length - 1; i++)
				{
					argsOut += "|" + args[i];
				}
			}
				
			int result = PlaceFunctionCall (webControl.Handle, function, returnTo, argsOut);
			
			string err;
			
			switch (result)
			{
				case 0:
					return;
				
				case 1:
					err = "Could not obtain IDOMDocument from GtkMozEmbed. Have you shown the window yet?";
					break;
					
				case 2:
					err = "Error finding 'jscall' nodes.";
					break;
					
				case 3:
					err = "Error getting number of 'jscall' nodes.";
					break;
					
				case 4:
					err = "More or fewer than one 'jscall' node.";
					break;
					
				case 5:
					err = "Error getting 'jscall' node.";
					break;
					
				case 6:
					err = "Error adding 'infunction' node.";
					break;
					
				case 7:
					err = "Error setting attributes on 'infunction' node.";
					break;
					
				case 8:
					err = "Error getting nsIDOMNode interface on 'infunction' node.";
					break;
					
				case 9:
					err = "Error appending 'infunction' node to 'jscall' node.";
					break;
					
				default:
					err = "The glue wrapper returned an unknown error.";
					break;
			}
			
			throw new Exception ("Glue function PlaceFunctionCall: "+err); 
		}

		public void RegisterJSHandler (string name, ClrCall handler)
		{
			if (!functions.Contains (name))
			{
				functions.Add (name, handler);
			}
			else
			{
				throw new Exception ("A handler with this name already exists");
			}

		}

		public void UnregisterJSHandler (string name)
		{
			if (functions.Contains (name))
			{
				functions.Remove (name);
			}
			else
			{
				throw new IndexOutOfRangeException ("A function with this name has not been registered");
			}
		}

	}


	public delegate string ClrCall (string[] args);
}
